use super::{
    models::{primary_author, SearchDoc},
    scoring::normalize_search_text,
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
    push_candidate_from_split(candidates, tokens, split_index);
}

fn append_suffix_candidate(candidates: &mut Vec<TitleAuthorCandidate>, tokens: &[&str]) {
    if tokens.len() < MIN_TITLE_TOKEN_COUNT + AUTHOR_SUFFIX_TOKEN_COUNT {
        return;
    }
    let split_index = tokens.len() - AUTHOR_SUFFIX_TOKEN_COUNT;
    if !looks_like_author_suffix(&tokens[split_index..]) {
        return;
    }
    push_candidate_from_split(candidates, tokens, split_index);
}

fn push_candidate_from_split(
    candidates: &mut Vec<TitleAuthorCandidate>,
    tokens: &[&str],
    split_index: usize,
) {
    if split_index < MIN_TITLE_TOKEN_COUNT || split_index >= tokens.len() {
        return;
    }
    let title = tokens[..split_index].join(" ");
    let author = tokens[split_index..].join(" ");
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
    let author_norm = normalize_search_text(&primary_author(doc));
    let author_tokens = author_norm.split_whitespace().collect::<Vec<_>>();
    candidate.author_tokens.iter().all(|token| {
        author_tokens
            .iter()
            .any(|author_token| author_token == token)
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
mod tests {
    use crate::book_search::models::SearchDoc;

    use super::{title_author_candidates, title_author_match_score};

    fn search_doc(title: &str, author: &str) -> SearchDoc {
        SearchDoc {
            author_name: Some(vec![author.to_string()]),
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: None,
            number_of_pages_median: None,
            title: Some(title.to_string()),
        }
    }

    #[test]
    fn suffix_candidate_uses_trailing_author_tokens() {
        let candidates = title_author_candidates("Death and the King's Horseman Wole Soyinka");

        assert_eq!(candidates[0].title, "Death and the King's Horseman");
        assert_eq!(candidates[0].author, "Wole Soyinka");
    }

    #[test]
    fn suffix_candidate_rejects_plain_title_endings() {
        let candidates = title_author_candidates("Death and the King's Horseman");

        assert!(candidates.is_empty());
    }

    #[test]
    fn match_score_requires_title_and_author() {
        let candidates = title_author_candidates("Death and the King's Horseman Wole Soyinka");
        let book = search_doc("Death and the King's Horseman", "Wole Soyinka");
        let criticism = search_doc(
            "Death and the King's Horseman and Wole Soyinka's Theater",
            "Jane Scholar",
        );

        assert!(title_author_match_score(&book, &candidates) > 0);
        assert_eq!(title_author_match_score(&criticism, &candidates), 0);
    }
}
