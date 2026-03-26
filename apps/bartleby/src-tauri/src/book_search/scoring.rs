use super::models::{primary_author, SearchDoc};

const OPEN_LIBRARY_LANGUAGE_ENGLISH: &str = "eng";
const SCORE_EXACT_TITLE: i64 = 960;
const SCORE_PREFIX_TITLE: i64 = 360;
const SCORE_CONTAINS_TITLE: i64 = 240;
const SCORE_TOKEN_PREFIX: i64 = 40;
const SCORE_TOKEN_CONTAINS: i64 = 20;
const SCORE_TOKEN_AUTHOR: i64 = 12;
const SCORE_AUTHOR_EXACT: i64 = 950;
const SCORE_AUTHOR_ALL_TOKENS: i64 = 650;
const SCORE_AUTHOR_PARTIAL_TOKEN: i64 = 45;
const SCORE_ENGLISH_LANGUAGE: i64 = 45;
const SCORE_HAS_PAGE_COUNT: i64 = 5;
const SCORE_MAX_EDITION_COUNT: i64 = 20;

fn normalize_search_text(value: &str) -> String {
    let mut out = String::new();
    let mut last_was_space = true;
    for character in value.chars().flat_map(char::to_lowercase) {
        apply_normalized_character(&mut out, &mut last_was_space, character);
    }
    out.trim().to_string()
}

fn apply_normalized_character(out: &mut String, last_was_space: &mut bool, character: char) {
    if character.is_alphanumeric() {
        out.push(character);
        *last_was_space = false;
        return;
    }
    if !*last_was_space {
        out.push(' ');
        *last_was_space = true;
    }
}

fn query_tokens(query: &str) -> Vec<String> {
    normalize_search_text(query)
        .split_whitespace()
        .map(str::to_string)
        .collect()
}

fn has_english_language(doc: &SearchDoc) -> bool {
    match doc.language.as_ref() {
        Some(languages) => languages.iter().any(|code| {
            let normalized = code.trim().to_lowercase();
            normalized == OPEN_LIBRARY_LANGUAGE_ENGLISH || normalized.ends_with("/eng")
        }),
        None => false,
    }
}

fn base_title_score(title_norm: &str, query_norm: &str) -> i64 {
    let mut score = 0;
    if title_norm == query_norm {
        score += SCORE_EXACT_TITLE;
    }
    if title_norm.starts_with(query_norm) {
        score += SCORE_PREFIX_TITLE;
    }
    if title_norm.contains(query_norm) {
        score += SCORE_CONTAINS_TITLE;
    }
    score
}

fn token_match_score(title_norm: &str, author_norm: &str, token: &str) -> i64 {
    if title_norm.starts_with(token) {
        return SCORE_TOKEN_PREFIX;
    }
    let mut score = 0;
    if title_norm.contains(token) {
        score += SCORE_TOKEN_CONTAINS;
    }
    if author_norm.contains(token) {
        score += SCORE_TOKEN_AUTHOR;
    }
    score
}

fn token_score(title_norm: &str, author_norm: &str, tokens: &[String]) -> i64 {
    tokens.iter().fold(0, |score, token| {
        score + token_match_score(title_norm, author_norm, token)
    })
}

fn score_matched_tokens(matched_count: usize, token_count: usize) -> i64 {
    if matched_count >= token_count {
        return SCORE_AUTHOR_ALL_TOKENS + (matched_count as i64 * SCORE_AUTHOR_PARTIAL_TOKEN);
    }
    matched_count as i64 * SCORE_AUTHOR_PARTIAL_TOKEN
}

fn author_match_score(author_norm: &str, query_norm: &str, tokens: &[String]) -> i64 {
    if author_norm.is_empty() || query_norm.is_empty() || tokens.is_empty() {
        return 0;
    }
    if author_norm == query_norm {
        return SCORE_AUTHOR_EXACT;
    }
    let author_tokens: Vec<&str> = author_norm.split_whitespace().collect();
    if author_tokens.is_empty() {
        return 0;
    }
    let matched_count = tokens
        .iter()
        .filter(|token| {
            author_tokens
                .iter()
                .any(|author_token| author_token == token)
        })
        .count();
    let minimum_matches = if tokens.len() >= 2 { 2 } else { 1 };
    if matched_count < minimum_matches {
        return 0;
    }
    score_matched_tokens(matched_count, tokens.len())
}

fn metadata_score(doc: &SearchDoc) -> i64 {
    let mut score = 0;
    if has_english_language(doc) {
        score += SCORE_ENGLISH_LANGUAGE;
    }
    if doc.number_of_pages_median.unwrap_or_default() > 0 {
        score += SCORE_HAS_PAGE_COUNT;
    }
    let edition_count = doc.edition_count.unwrap_or_default();
    if edition_count > 0 {
        score += edition_count.min(SCORE_MAX_EDITION_COUNT);
    }
    score
}

fn author_only_score(doc: &SearchDoc, query_norm: &str, tokens: &[String]) -> i64 {
    let author_norm = normalize_search_text(&primary_author(doc));
    let author_score = author_match_score(&author_norm, query_norm, tokens);
    if author_score <= 0 {
        return 0;
    }
    author_score + metadata_score(doc)
}

pub fn score_doc(doc: &SearchDoc, query: &str, author_only: bool) -> i64 {
    let query_norm = normalize_search_text(query);
    let tokens = query_tokens(query);
    if author_only {
        return author_only_score(doc, &query_norm, &tokens);
    }
    let title_norm = normalize_search_text(doc.title.as_deref().unwrap_or_default());
    let author_norm = normalize_search_text(&primary_author(doc));
    let text_score = base_title_score(&title_norm, &query_norm)
        + token_score(&title_norm, &author_norm, &tokens);
    if title_norm.is_empty() && text_score <= 0 {
        return 0;
    }
    text_score + metadata_score(doc)
}

#[cfg(test)]
mod tests {
    use super::{
        has_english_language, normalize_search_text, primary_author, query_tokens, score_doc,
        SearchDoc,
    };

    #[test]
    fn page_counts_raise_ranked_score() {
        let with_pages = SearchDoc {
            author_name: Some(vec!["Frank Herbert".to_string()]),
            cover_i: Some(12),
            edition_count: Some(4),
            first_publish_year: Some(1965),
            key: Some("/works/OL1W".to_string()),
            language: Some(vec!["eng".to_string()]),
            number_of_pages_median: Some(412),
            title: Some("Dune".to_string()),
        };
        let without_pages = SearchDoc {
            number_of_pages_median: None,
            ..with_pages.clone()
        };

        assert!(score_doc(&with_pages, "dune", false) > score_doc(&without_pages, "dune", false));
    }

    #[test]
    fn author_only_queries_reject_unrelated_authors() {
        let doc = SearchDoc {
            author_name: Some(vec!["Toni Morrison".to_string()]),
            cover_i: None,
            edition_count: Some(1),
            first_publish_year: Some(1970),
            key: Some("/works/OL2W".to_string()),
            language: Some(vec!["eng".to_string()]),
            number_of_pages_median: Some(220),
            title: Some("Sula".to_string()),
        };

        assert_eq!(score_doc(&doc, "octavia butler", true), 0);
    }

    #[test]
    fn normalize_search_text_lowercases_and_strips_punctuation_noise() {
        assert_eq!(
            normalize_search_text("  L'etranger: A Novel?!  "),
            "l etranger a novel"
        );
    }

    #[test]
    fn query_tokens_returns_only_normalized_non_empty_tokens() {
        assert_eq!(query_tokens("  Deep   Work!!!  "), vec!["deep", "work"]);
    }

    #[test]
    fn primary_author_returns_first_author_and_handles_missing_authors() {
        let doc = SearchDoc {
            author_name: Some(vec!["Cal Newport".to_string(), "Ghost".to_string()]),
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: None,
            number_of_pages_median: None,
            title: None,
        };
        assert_eq!(primary_author(&doc), "Cal Newport");
        assert!(primary_author(&SearchDoc {
            author_name: Some(Vec::new()),
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: None,
            number_of_pages_median: None,
            title: None,
        })
        .is_empty());
    }

    #[test]
    fn has_english_language_recognizes_canonical_and_namespaced_tags() {
        assert!(has_english_language(&SearchDoc {
            author_name: None,
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: Some(vec!["eng".to_string()]),
            number_of_pages_median: None,
            title: None,
        }));
        assert!(has_english_language(&SearchDoc {
            author_name: None,
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: Some(vec!["/languages/eng".to_string()]),
            number_of_pages_median: None,
            title: None,
        }));
    }

    #[test]
    fn score_doc_keeps_author_token_matches_when_title_is_missing() {
        let score = score_doc(
            &SearchDoc {
                author_name: Some(vec!["George Orwell".to_string()]),
                cover_i: None,
                edition_count: Some(3),
                first_publish_year: None,
                key: None,
                language: Some(vec!["eng".to_string()]),
                number_of_pages_median: None,
                title: None,
            },
            "George Orwell",
            false,
        );
        assert!(score > 0);
    }
}
