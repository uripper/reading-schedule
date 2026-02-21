#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ISSUES_FILE="ISSUES.md"
DEFAULT_LABEL_COLOR="BFD4F2"
SYNC_MARKER_PREFIX="Sync-ID: "
REPO_PLACEHOLDER="OWNER/REPO"

usage() {
  cat <<'EOF'
Sync GitHub issues from ISSUES.md without creating duplicates.

Usage:
  scripts/sync_issues.sh [options]

Options:
  --file <path>      Path to issues markdown file (default: ISSUES.md)
  --repo <owner/repo>
                     Target repository. If omitted, current gh repo is used.
  --id <ISSUE-ID>    Sync only one issue ID (repeatable, e.g. ISSUE-006)
  --dry-run          Parse and print planned actions without GitHub API writes
  -h, --help         Show this help text

Behavior:
  - Each issue body includes a stable marker line: "Sync-ID: ISSUE-XYZ"
  - Existing issues are discovered by that marker (open and closed)
  - If found, issue is updated; if not found, issue is created
EOF
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

extract_section() {
  local issues_file="$1"
  local heading_line="$2"
  awk -v heading="$heading_line" '
    $0 == heading {
      capture = 1
      next
    }
    capture && /^## ISSUE-[0-9]+:/ {
      exit
    }
    capture {
      print
    }
  ' "$issues_file"
}

field_value() {
  local section="$1"
  local field_name="$2"
  printf '%s\n' "$section" |
    sed -n "s/^\\*\\*${field_name}:\\*\\*[[:space:]]*//p" |
    head -n 1
}

content_from_section() {
  local section="$1"
  local content
  content="$(printf '%s\n' "$section" | awk '
    /^Problem:$/ {
      capture = 1
    }
    capture {
      print
    }
  ')"
  if [[ -n "$(printf '%s' "$content" | tr -d '[:space:]')" ]]; then
    printf '%s\n' "$content"
    return
  fi
  printf '%s\n' "$section"
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

find_existing_issue_numbers() {
  local repo="$1"
  local issue_id="$2"
  local query
  query="\"${SYNC_MARKER_PREFIX}${issue_id}\" in:body"
  gh issue list \
    --repo "$repo" \
    --state all \
    --search "$query" \
    --limit 200 \
    --json number \
    --jq '.[].number'
}

issues_file="$DEFAULT_ISSUES_FILE"
repo=""
dry_run=0
declare -a requested_ids=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      [[ $# -lt 2 ]] && die "--file requires a path"
      issues_file="$2"
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

[[ -f "$issues_file" ]] || die "issues file not found: $issues_file"

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

mapfile -t issue_headings < <(grep -E '^## ISSUE-[0-9]+: .+$' "$issues_file")
if [[ "${#issue_headings[@]}" -eq 0 ]]; then
  die "no issue sections found in $issues_file"
fi

temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

synced_count=0
skipped_count=0

for heading in "${issue_headings[@]}"; do
  if [[ ! "$heading" =~ ^##[[:space:]](ISSUE-[0-9]+):[[:space:]](.+)$ ]]; then
    continue
  fi

  issue_id="${BASH_REMATCH[1]}"
  issue_title="${BASH_REMATCH[2]}"

  if [[ "${#REQUESTED_ID_SET[@]}" -gt 0 ]] && [[ -z "${REQUESTED_ID_SET[$issue_id]+x}" ]]; then
    skipped_count=$((skipped_count + 1))
    continue
  fi

  section="$(extract_section "$issues_file" "$heading")"
  type_value="$(field_value "$section" "Type")"
  priority_value="$(field_value "$section" "Priority")"
  labels_line="$(field_value "$section" "Labels")"

  mapfile -t labels < <(resolve_labels "$labels_line")
  content="$(content_from_section "$section")"
  body_file="$temp_dir/${issue_id}.md"

  {
    printf '<!-- issue-sync-id:%s -->\n' "$issue_id"
    printf '%s%s\n\n' "$SYNC_MARKER_PREFIX" "$issue_id"
    printf '_This issue body is synced from `%s` via `scripts/sync_issues.sh`._\n\n' "$issues_file"
    if [[ -n "$type_value" ]]; then
      printf '**Type:** %s  \n' "$type_value"
    fi
    if [[ -n "$priority_value" ]]; then
      printf '**Priority:** %s\n' "$priority_value"
    fi
    if [[ "${#labels[@]}" -gt 0 ]]; then
      printf '**Labels (source):** '
      printf '%s' "${labels[0]}"
      for ((index = 1; index < ${#labels[@]}; index += 1)); do
        printf ', %s' "${labels[$index]}"
      done
      printf '\n'
    fi
    printf '\n%s\n' "$content"
  } >"$body_file"

  if [[ "$dry_run" -eq 1 ]]; then
    printf '[dry-run] would upsert %s -> %s\n' "$issue_id" "$issue_title"
    if [[ "${#labels[@]}" -gt 0 ]]; then
      printf '[dry-run] labels: %s\n' "$(IFS=', '; echo "${labels[*]}")"
    else
      printf '[dry-run] labels: (none)\n'
    fi
    synced_count=$((synced_count + 1))
    SEEN_REQUESTED_IDS["$issue_id"]=1
    continue
  fi

  for label in "${labels[@]}"; do
    ensure_label_exists "$repo" "$label"
  done

  found_numbers_raw="$(find_existing_issue_numbers "$repo" "$issue_id")" || {
    die "failed to query existing issues for ${issue_id} in repo '${repo}'"
  }
  mapfile -t found_numbers < <(printf '%s\n' "$found_numbers_raw" | grep -E '^[0-9]+$' || true)
  existing_number=""

  if [[ "${#found_numbers[@]}" -gt 0 ]]; then
    existing_number="$(printf '%s\n' "${found_numbers[@]}" | sort -n | head -n 1)"
  fi

  if [[ "${#found_numbers[@]}" -gt 1 ]]; then
    printf 'warning: multiple matches for %s (%s); updating #%s\n' \
      "$issue_id" "$(IFS=', '; echo "${found_numbers[*]}")" "$existing_number" >&2
  fi

  if [[ -n "$existing_number" ]]; then
    edit_args=("$existing_number" --repo "$repo" --title "$issue_title" --body-file "$body_file")
    for label in "${labels[@]}"; do
      edit_args+=(--add-label "$label")
    done
    gh issue edit "${edit_args[@]}" >/dev/null
    printf 'updated #%s (%s)\n' "$existing_number" "$issue_id"
  else
    create_args=(--repo "$repo" --title "$issue_title" --body-file "$body_file")
    for label in "${labels[@]}"; do
      create_args+=(--label "$label")
    done
    created_ref="$(gh issue create "${create_args[@]}")"
    printf 'created %s (%s)\n' "$created_ref" "$issue_id"
  fi

  synced_count=$((synced_count + 1))
  SEEN_REQUESTED_IDS["$issue_id"]=1
done

if [[ "${#REQUESTED_ID_SET[@]}" -gt 0 ]]; then
  for requested_id in "${requested_ids[@]}"; do
    if [[ -z "${SEEN_REQUESTED_IDS[$requested_id]+x}" ]]; then
      die "requested --id not found in ${issues_file}: ${requested_id}"
    fi
  done
fi

printf 'done: synced=%d skipped=%d repo=%s\n' "$synced_count" "$skipped_count" "$repo"
