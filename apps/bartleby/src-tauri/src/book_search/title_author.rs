use super::{
    models::{author_names, SearchDoc},
    scoring::normalize_search_text,
    transliteration::tokens_match,
};

pub const TITLE_AUTHOR_REQUEST_LIMIT: usize = 2;

const AUTHOR_SUFFIX_TOKEN_COUNT: usize = 2;
const MIN_TITLE_TOKEN_COUNT: usize = 2;
const SCORE_TITLE_AUTHOR_AUTHOR: i64 = 1_200;
const SCORE_TITLE_AUTHOR_CONTAINS: i64 = 720;
const SCORE_TITLE_AUTHOR_EXACT: i64 = 2_400;
const SCORE_TITLE_AUTHOR_PREFIX: i64 = 1_000;
const SEPARATOR_BY: &str = "by";
const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "for", "in", "of", "on", "the", "to", "with",
];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TitleAuthorCandidate {
    pub author: String,
    pub title: String,
    author_tokens: Vec<String>,
    title_norm: String,
}

pub fn title_author_candidates(query: &str) -> Vec<TitleAuthorCandidate> {
    let tokens = query.split_whitespace().collect::<Vec<_>>();
    let mut candidates = Vec::new();
    append_by_candidate(&mut candidates, &tokens);
    append_suffix_candidate(&mut candidates, &tokens);
    candidates
}

pub fn title_author_match_score(doc: &SearchDoc, candidates: &[TitleAuthorCandidate]) -> i64 {
    candidates
        .iter()
        .map(|candidate| candidate_match_score(doc, candidate))
        .max()
        .unwrap_or_default()
}

fn append_by_candidate(candidates: &mut Vec<TitleAuthorCandidate>, tokens: &[&str]) {
    let Some(split_index) = tokens
        .iter()
        .rposition(|token| normalize_search_text(token) == SEPARATOR_BY)
    else {
        return;
    };
    push_candidate_from_split(
        candidates,
        &tokens[..split_index],
        &tokens[split_index + 1..],
    );
}

fn append_suffix_candidate(candidates: &mut Vec<TitleAuthorCandidate>, tokens: &[&str]) {
    if tokens.len() < MIN_TITLE_TOKEN_COUNT + AUTHOR_SUFFIX_TOKEN_COUNT {
        return;
    }
    let split_index = tokens.len() - AUTHOR_SUFFIX_TOKEN_COUNT;
    if !looks_like_author_suffix(&tokens[split_index..]) {
        return;
    }
    push_candidate_from_split(candidates, &tokens[..split_index], &tokens[split_index..]);
}

fn push_candidate_from_split(
    candidates: &mut Vec<TitleAuthorCandidate>,
    title_tokens: &[&str],
    author_tokens: &[&str],
) {
    if title_tokens.len() < MIN_TITLE_TOKEN_COUNT || author_tokens.is_empty() {
        return;
    }
    let title = title_tokens.join(" ");
    let author = author_tokens.join(" ");
    push_candidate(candidates, &title, &author);
}

fn push_candidate(candidates: &mut Vec<TitleAuthorCandidate>, title: &str, author: &str) {
    let Some(candidate) = candidate_from_parts(title, author) else {
        return;
    };
    if candidates.contains(&candidate) {
        return;
    }
    candidates.push(candidate);
}

fn looks_like_author_suffix(tokens: &[&str]) -> bool {
    tokens
        .iter()
        .all(|token| normalized_author_suffix_token(token).is_some())
}

fn normalized_author_suffix_token(token: &str) -> Option<String> {
    let normalized = normalize_search_text(token);
    if normalized.is_empty() || normalized.split_whitespace().count() != 1 {
        return None;
    }
    if STOP_WORDS.contains(&normalized.as_str()) {
        return None;
    }
    Some(normalized)
}

fn candidate_match_score(doc: &SearchDoc, candidate: &TitleAuthorCandidate) -> i64 {
    let title_norm = normalize_search_text(doc.title.as_deref().unwrap_or_default());
    let title_score = title_match_score(&title_norm, candidate);
    if title_score <= 0 {
        return 0;
    }
    if !author_matches_candidate(doc, candidate) {
        return 0;
    }
    title_score + SCORE_TITLE_AUTHOR_AUTHOR
}

fn title_match_score(title_norm: &str, candidate: &TitleAuthorCandidate) -> i64 {
    if title_norm == candidate.title_norm {
        return SCORE_TITLE_AUTHOR_EXACT;
    }
    if title_norm.starts_with(&candidate.title_norm) {
        return SCORE_TITLE_AUTHOR_PREFIX;
    }
    if title_norm.contains(&candidate.title_norm) {
        return SCORE_TITLE_AUTHOR_CONTAINS;
    }
    0
}

fn author_matches_candidate(doc: &SearchDoc, candidate: &TitleAuthorCandidate) -> bool {
    author_names(doc).any(|name| author_name_matches_candidate(name, candidate))
}

fn author_name_matches_candidate(name: &str, candidate: &TitleAuthorCandidate) -> bool {
    let author_norm = normalize_search_text(name);
    let author_tokens = author_norm.split_whitespace().collect::<Vec<_>>();
    candidate.author_tokens.iter().all(|token| {
        author_tokens
            .iter()
            .any(|author_token| tokens_match(author_token, token))
    })
}

fn candidate_from_parts(title: &str, author: &str) -> Option<TitleAuthorCandidate> {
    let title_text = title.trim();
    let author_text = author.trim();
    let title_norm = normalize_search_text(title_text);
    let author_tokens = normalize_search_text(author_text)
        .split_whitespace()
        .map(str::to_string)
        .collect::<Vec<_>>();
    if title_norm.is_empty() || author_tokens.is_empty() {
        return None;
    }
    Some(TitleAuthorCandidate {
        author: author_text.to_string(),
        title: title_text.to_string(),
        author_tokens,
        title_norm,
    })
}

#[cfg(test)]
#[path = "title_author_tests.rs"]
mod tests;
