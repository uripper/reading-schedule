#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ISSUES_DIR="Issues"
OPEN_DIR_NAME="Open"
CLOSED_DIR_NAME="Closed"
DEFAULT_LABEL_COLOR="BFD4F2"
SYNC_MARKER_PREFIX="Sync-ID: "
REPO_PLACEHOLDER="OWNER/REPO"

usage() {
  cat <<'USAGE_EOF'
Sync GitHub issues from per-issue markdown files without creating duplicates.

Usage:
  scripts/sync_issues.sh [options]

Options:
  --dir <path>       Path to issue directory root (default: Issues)
                     Expected layout: <dir>/Open/*.md and <dir>/Closed/*.md
  --repo <owner/repo>
                     Target repository. If omitted, current gh repo is used.
  --id <ISSUE-ID>    Sync only one issue ID (repeatable, e.g. ISSUE-006)
  --dry-run          Parse and print planned actions without GitHub API writes
  -h, --help         Show this help text

Behavior:
  - Each issue body includes a stable marker line: "Sync-ID: ISSUE-XYZ"
  - Existing issues are discovered by that marker (open and closed)
  - Files in Open are synced as open issues
  - Files in Closed are synced as closed issues (and open issues are closed)
USAGE_EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

trim() {
  local text="$1"
  text="${text#"${text%%[![:space:]]*}"}"
  text="${text%"${text##*[![:space:]]}"}"
  printf '%s' "$text"
}

field_value() {
  local section="$1"
  local field_name="$2"
  printf '%s\n' "$section" |
    sed -n "s/^\\*\\*${field_name}:\\*\\*[[:space:]]*//p" |
    head -n 1
}

resolve_labels() {
  local labels_line="$1"
  local sanitized
  local label
  local raw_label
  sanitized="${labels_line//\`/}"
  IFS=',' read -r -a raw_labels <<<"$sanitized"
  for raw_label in "${raw_labels[@]}"; do
    label="$(trim "$raw_label")"
    if [[ -n "$label" ]]; then
      printf '%s\n' "$label"
    fi
  done
}

ensure_label_exists() {
  local repo="$1"
  local label="$2"
  if [[ -n "${KNOWN_LABELS[$label]+x}" ]]; then
    return
  fi
  gh label create "$label" --repo "$repo" --color "$DEFAULT_LABEL_COLOR" >/dev/null
  KNOWN_LABELS["$label"]=1
  printf 'created missing label: %s\n' "$label"
}

find_existing_issue_entries() {
  local repo="$1"
  local issue_id="$2"
  local query
  query="\"${SYNC_MARKER_PREFIX}${issue_id}\" in:body"
  gh issue list \
    --repo "$repo" \
    --state all \
    --search "$query" \
    --limit 200 \
    --json number,state \
    --jq '.[] | "\(.number) \(.state)"'
}

validate_issue_file_heading() {
  local issue_file="$1"
  local validation_output

  if ! validation_output="$(awk '
    /^#[#]*[[:space:]]ISSUE-/ {
      issue_like_count += 1
      if ($0 ~ /^#[#]*[[:space:]]ISSUE-[0-9]+: .+$/) {
        canonical_count += 1
      } else {
        printf "line %d: %s\n", NR, $0
        malformed_count += 1
      }
    }
    END {
      if (canonical_count == 0) {
        print "missing canonical heading: # ISSUE-###: Title"
        exit 1
      }
      if (canonical_count > 1) {
        printf "multiple canonical headings found: %d\n", canonical_count
        exit 1
      }
      if (malformed_count > 0) {
        exit 1
      }
    }
  ' "$issue_file")"; then
    die "invalid issue heading in ${issue_file}: ${validation_output}"
  fi
}

extract_heading() {
  local issue_file="$1"
  awk '
    /^#[#]*[[:space:]]ISSUE-[0-9]+: .+$/ {
      print
      exit
    }
  ' "$issue_file"
}

extract_section() {
  local issue_file="$1"
  awk '
    found_heading == 1 {
      print
      next
    }
    /^#[#]*[[:space:]]ISSUE-[0-9]+: .+$/ {
      found_heading = 1
      next
    }
  ' "$issue_file"
}

parse_issue_id_from_heading() {
  local heading_line="$1"
  printf '%s\n' "$heading_line" |
    sed -n 's/^#\{1,6\}[[:space:]]\(ISSUE-[0-9]\+\): .*/\1/p'
}

parse_issue_title_from_heading() {
  local heading_line="$1"
  printf '%s\n' "$heading_line" |
    sed -n 's/^#\{1,6\}[[:space:]]ISSUE-[0-9]\+: \(.*\)$/\1/p'
}

issue_number_from_ref() {
  local ref="$1"
  if [[ "$ref" =~ /([0-9]+)$ ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return
  fi
  die "unable to parse issue number from create response: ${ref}"
}

issues_dir="$DEFAULT_ISSUES_DIR"
repo=""
dry_run=0
declare -a requested_ids=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      [[ $# -lt 2 ]] && die "--dir requires a path"
      issues_dir="$2"
      shift 2
      ;;
    --repo)
      [[ $# -lt 2 ]] && die "--repo requires owner/repo"
      repo="$2"
      shift 2
      ;;
    --id)
      [[ $# -lt 2 ]] && die "--id requires an ISSUE-ID value"
      requested_ids+=("$2")
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ -d "$issues_dir" ]] || die "issues directory not found: $issues_dir"

open_dir="${issues_dir}/${OPEN_DIR_NAME}"
closed_dir="${issues_dir}/${CLOSED_DIR_NAME}"

[[ -d "$open_dir" ]] || die "missing open directory: $open_dir"
[[ -d "$closed_dir" ]] || die "missing closed directory: $closed_dir"

mapfile -d '' -t open_files < <(find "$open_dir" -mindepth 1 -maxdepth 1 -type f -name '*.md' -print0 | LC_ALL=C sort -z)
mapfile -d '' -t closed_files < <(find "$closed_dir" -mindepth 1 -maxdepth 1 -type f -name '*.md' -print0 | LC_ALL=C sort -z)

if [[ "${#open_files[@]}" -eq 0 ]] && [[ "${#closed_files[@]}" -eq 0 ]]; then
  die "no issue markdown files found in ${open_dir} or ${closed_dir}"
fi

if [[ "$dry_run" -eq 0 ]]; then
  command -v gh >/dev/null 2>&1 || die "gh CLI is required"
  gh auth status >/dev/null 2>&1 || die "gh auth status failed; run 'gh auth login'"
fi

if [[ -z "$repo" ]]; then
  if [[ "$dry_run" -eq 1 ]]; then
    repo="$REPO_PLACEHOLDER"
  else
    repo="$(gh repo view --json nameWithOwner --jq '.nameWithOwner')"
  fi
fi

if [[ "$dry_run" -eq 0 ]]; then
  gh repo view "$repo" --json nameWithOwner --jq '.nameWithOwner' >/dev/null 2>&1 || {
    die "unable to access repo '${repo}'. Verify owner/repo and gh auth permissions."
  }
fi

declare -A REQUESTED_ID_SET=()
declare -A SEEN_REQUESTED_IDS=()
declare -A KNOWN_LABELS=()
declare -A ISSUE_PATHS_BY_ID=()

declare -a issue_entries=()

for requested_id in "${requested_ids[@]}"; do
  REQUESTED_ID_SET["$requested_id"]=1
done

if [[ "$dry_run" -eq 0 ]]; then
  existing_labels_raw="$(gh label list --repo "$repo" --limit 500 --json name --jq '.[].name')" || {
    die "failed to load labels for repo '${repo}'"
  }
  while IFS= read -r label_name; do
    if [[ -n "$label_name" ]]; then
      KNOWN_LABELS["$label_name"]=1
    fi
  done <<<"$existing_labels_raw"
fi

for issue_file in "${open_files[@]}"; do
  issue_entries+=("open|${issue_file}")
done

for issue_file in "${closed_files[@]}"; do
  issue_entries+=("closed|${issue_file}")
done

temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

synced_count=0
skipped_count=0

for entry in "${issue_entries[@]}"; do
  target_state="${entry%%|*}"
  issue_file="${entry#*|}"

  validate_issue_file_heading "$issue_file"

  heading_line="$(extract_heading "$issue_file")"
  [[ -n "$heading_line" ]] || die "missing issue heading in ${issue_file}"

  issue_id="$(parse_issue_id_from_heading "$heading_line")"
  issue_title="$(parse_issue_title_from_heading "$heading_line")"

  [[ -n "$issue_id" ]] || die "unable to parse issue ID in ${issue_file}"
  [[ -n "$issue_title" ]] || die "unable to parse issue title in ${issue_file}"

  if [[ -n "${ISSUE_PATHS_BY_ID[$issue_id]+x}" ]]; then
    die "duplicate issue ID '${issue_id}' in '${ISSUE_PATHS_BY_ID[$issue_id]}' and '${issue_file}'"
  fi
  ISSUE_PATHS_BY_ID["$issue_id"]="$issue_file"

  if [[ "${#REQUESTED_ID_SET[@]}" -gt 0 ]] && [[ -z "${REQUESTED_ID_SET[$issue_id]+x}" ]]; then
    skipped_count=$((skipped_count + 1))
    continue
  fi

  SEEN_REQUESTED_IDS["$issue_id"]=1

  section="$(extract_section "$issue_file")"
  type_value="$(field_value "$section" "Type")"
  priority_value="$(field_value "$section" "Priority")"
  labels_line="$(field_value "$section" "Labels")"

  mapfile -t labels < <(resolve_labels "$labels_line")

  body_file="$temp_dir/${issue_id}.md"

  {
    printf '<!-- issue-sync-id:%s -->\n' "$issue_id"
    printf '%s%s\n\n' "$SYNC_MARKER_PREFIX" "$issue_id"
    printf '_This issue body is synced from `%s` via `scripts/sync_issues.sh`._\n\n' "$issue_file"
    printf '%s\n' "$section"
  } >"$body_file"

  if [[ "$dry_run" -eq 1 ]]; then
    if [[ "$target_state" == "closed" ]]; then
      printf '[dry-run] would upsert+close %s -> %s\n' "$issue_id" "$issue_title"
    else
      printf '[dry-run] would upsert+open %s -> %s\n' "$issue_id" "$issue_title"
    fi
    if [[ "${#labels[@]}" -gt 0 ]]; then
      printf '[dry-run] labels: %s\n' "$(IFS=', '; echo "${labels[*]}")"
    else
      printf '[dry-run] labels: (none)\n'
    fi
    synced_count=$((synced_count + 1))
    continue
  fi

  for label in "${labels[@]}"; do
    ensure_label_exists "$repo" "$label"
  done

  found_entries_raw="$(find_existing_issue_entries "$repo" "$issue_id")" || {
    die "failed to query existing issues for ${issue_id} in repo '${repo}'"
  }

  mapfile -t found_entries < <(printf '%s\n' "$found_entries_raw" | awk '$1 ~ /^[0-9]+$/ {print $1 " " tolower($2)}' | sort -n -k1,1)

  existing_number=""
  existing_state=""

  if [[ "${#found_entries[@]}" -gt 0 ]]; then
    existing_number="$(printf '%s\n' "${found_entries[0]}" | awk '{print $1}')"
    existing_state="$(printf '%s\n' "${found_entries[0]}" | awk '{print $2}')"
  fi

  if [[ "${#found_entries[@]}" -gt 1 ]]; then
    printf 'warning: multiple matches for %s (%s); updating #%s\n' \
      "$issue_id" "$(IFS=', '; echo "${found_entries[*]}")" "$existing_number" >&2
  fi

  if [[ -n "$existing_number" ]]; then
    edit_args=("$existing_number" --repo "$repo" --title "$issue_title" --body-file "$body_file")
    for label in "${labels[@]}"; do
      edit_args+=(--add-label "$label")
    done
    gh issue edit "${edit_args[@]}" >/dev/null

    if [[ "$target_state" == "closed" ]] && [[ "$existing_state" != "closed" ]]; then
      gh issue close "$existing_number" --repo "$repo" >/dev/null
      printf 'updated+closed #%s (%s)\n' "$existing_number" "$issue_id"
    elif [[ "$target_state" == "open" ]] && [[ "$existing_state" == "closed" ]]; then
      gh issue reopen "$existing_number" --repo "$repo" >/dev/null
      printf 'updated+reopened #%s (%s)\n' "$existing_number" "$issue_id"
    else
      printf 'updated #%s (%s)\n' "$existing_number" "$issue_id"
    fi
  else
    create_args=(--repo "$repo" --title "$issue_title" --body-file "$body_file")
    for label in "${labels[@]}"; do
      create_args+=(--label "$label")
    done
    created_ref="$(gh issue create "${create_args[@]}")"
    created_number="$(issue_number_from_ref "$created_ref")"

    if [[ "$target_state" == "closed" ]]; then
      gh issue close "$created_number" --repo "$repo" >/dev/null
      printf 'created+closed %s (%s)\n' "$created_ref" "$issue_id"
    else
      printf 'created %s (%s)\n' "$created_ref" "$issue_id"
    fi
  fi

  synced_count=$((synced_count + 1))
done

if [[ "${#REQUESTED_ID_SET[@]}" -gt 0 ]]; then
  for requested_id in "${requested_ids[@]}"; do
    if [[ -z "${SEEN_REQUESTED_IDS[$requested_id]+x}" ]]; then
      die "requested --id not found in ${issues_dir}: ${requested_id}"
    fi
  done
fi

printf 'done: synced=%d skipped=%d repo=%s\n' "$synced_count" "$skipped_count" "$repo"
