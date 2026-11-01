//! Fallback for misspelled author names when a lookup finds nothing.
//!
//! Open Library has no fuzzy matching, so `Doestoevsky` returns zero results.
//! When the normal requests rank no results, each long query word is turned
//! into a wildcard pattern that keeps its consonants and lets vowels vary
//! (`doestoevsky` becomes `d*st*vsk*`) and is sent as an author search. Docs
//! from that search are kept only when one of their author names is a close
//! spelling variant of a query word, so loose wildcard hits are discarded.
//! No name lists are involved; any author spelling is handled the same way.

use super::{
    models::{author_names, SearchDoc},
    scoring::normalize_search_text,
    transliteration::{folded_token, has_reliable_key, tokens_closely_match},
};

const FALLBACK_TOKEN_LIMIT: usize = 2;
const PATTERN_VOWELS: &str = "aeiouy";
const WILDCARD: char = '*';

/// Returns wildcard author patterns for the longest eligible query words.
pub fn spelling_fallback_patterns(query: &str) -> Vec<String> {
    let mut tokens = normalize_search_text(query)
        .split_whitespace()
        .map(folded_token)
        .filter(|token| has_reliable_key(token))
        .collect::<Vec<_>>();
    tokens.sort_by(|left, right| right.len().cmp(&left.len()).then_with(|| left.cmp(right)));
    tokens.dedup();
    tokens
        .iter()
        .take(FALLBACK_TOKEN_LIMIT)
        .map(|token| wildcard_pattern(token))
        .collect()
}

/// Returns whether a fallback doc has an author name matching a query word.
pub fn matches_query_author(doc: &SearchDoc, query: &str) -> bool {
    let query_norm = normalize_search_text(query);
    let query_tokens = query_norm.split_whitespace().collect::<Vec<_>>();
    author_names(doc).any(|name| name_matches_any_token(name, &query_tokens))
}

fn name_matches_any_token(name: &str, query_tokens: &[&str]) -> bool {
    let name_norm = normalize_search_text(name);
    name_norm.split_whitespace().any(|name_token| {
        query_tokens
            .iter()
            .any(|query_token| tokens_closely_match(name_token, query_token))
    })
}

fn wildcard_pattern(token: &str) -> String {
    let mut characters = token.chars();
    let mut pattern = characters.next().map(String::from).unwrap_or_default();
    for character in characters {
        push_pattern_character(&mut pattern, character);
    }
    if !pattern.ends_with(WILDCARD) {
        pattern.push(WILDCARD);
    }
    pattern
}

fn push_pattern_character(pattern: &mut String, character: char) {
    if !PATTERN_VOWELS.contains(character) {
        pattern.push(character);
        return;
    }
    if !pattern.ends_with(WILDCARD) {
        pattern.push(WILDCARD);
    }
}

#[cfg(test)]
mod tests {
    use super::{matches_query_author, spelling_fallback_patterns};
    use crate::book_search::models::SearchDoc;

    fn author_doc(primary: &str, alternatives: &[&str]) -> SearchDoc {
        SearchDoc {
            author_alternative_name: Some(
                alternatives.iter().map(|name| name.to_string()).collect(),
            ),
            author_name: Some(vec![primary.to_string()]),
            ..SearchDoc::default()
        }
    }

    #[test]
    fn patterns_keep_consonants_and_wildcard_vowels() {
        assert_eq!(spelling_fallback_patterns("Doestoevsky"), vec!["d*st*vsk*"]);
        assert_eq!(
            spelling_fallback_patterns("solzenitsin"),
            vec!["s*lz*n*ts*n*"]
        );
    }

    #[test]
    fn patterns_use_the_longest_reliable_words_only() {
        assert_eq!(
            spelling_fallback_patterns("the brothers karamazov by doestoevsky"),
            vec!["d*st*vsk*", "k*r*m*z*v*"]
        );
        assert!(spelling_fallback_patterns("by an ox").is_empty());
    }

    #[test]
    fn fallback_docs_must_have_a_matching_author_spelling() {
        let dostoevsky = author_doc("Фёдор Михайлович Достоевский", &["Fyodor Dostoevsky"]);
        let markham = author_doc("Beryl Markham", &[]);

        assert!(matches_query_author(&dostoevsky, "Doestoevsky"));
        assert!(!matches_query_author(&markham, "murakamy"));
    }
}
