use super::{
    has_english_language, normalize_search_text, primary_author, query_tokens, score_doc, SearchDoc,
};

fn english_doc(title: &str, author: &str) -> SearchDoc {
    SearchDoc {
        author_name: Some(vec![author.to_string()]),
        edition_count: Some(3),
        key: Some("/works/OL1W".to_string()),
        language: Some(vec!["eng".to_string()]),
        title: Some(title.to_string()),
        ..SearchDoc::default()
    }
}

fn language_doc(code: &str) -> SearchDoc {
    SearchDoc {
        language: Some(vec![code.to_string()]),
        ..SearchDoc::default()
    }
}

#[test]
fn page_counts_raise_ranked_score() {
    let with_pages = SearchDoc {
        number_of_pages_median: Some(412),
        ..english_doc("Dune", "Frank Herbert")
    };
    let without_pages = english_doc("Dune", "Frank Herbert");

    assert!(score_doc(&with_pages, "dune", false) > score_doc(&without_pages, "dune", false));
}

#[test]
fn author_only_queries_reject_unrelated_authors() {
    let doc = english_doc("Sula", "Toni Morrison");

    assert_eq!(score_doc(&doc, "octavia butler", true), 0);
}

#[test]
fn author_only_queries_match_transliterated_alternative_names() {
    let doc = SearchDoc {
        author_alternative_name: Some(vec!["Fyodor Dostoyevsky".to_string()]),
        ..english_doc("Crime and Punishment", "Фёдор Михайлович Достоевский")
    };

    assert!(score_doc(&doc, "Dostoevsky", true) > 0);
    assert!(score_doc(&doc, "Dostojewski", true) > 0);
}

#[test]
fn author_tokens_raise_title_scores_through_transliteration() {
    let doc = english_doc("Anna Karenina", "Лев Толстой");
    let unrelated = english_doc("Anna Karenina", "Someone Else");

    assert!(
        score_doc(&doc, "anna karenina tolstoy", false)
            > score_doc(&unrelated, "anna karenina tolstoy", false)
    );
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
        ..SearchDoc::default()
    };
    assert_eq!(primary_author(&doc), "Cal Newport");
    assert!(primary_author(&SearchDoc {
        author_name: Some(Vec::new()),
        ..SearchDoc::default()
    })
    .is_empty());
}

#[test]
fn has_english_language_recognizes_canonical_and_namespaced_tags() {
    assert!(has_english_language(&language_doc("eng")));
    assert!(has_english_language(&language_doc("/languages/eng")));
    assert!(!has_english_language(&language_doc("spa")));
}

#[test]
fn score_doc_keeps_author_token_matches_when_title_is_missing() {
    let score = score_doc(
        &SearchDoc {
            title: None,
            ..english_doc("", "George Orwell")
        },
        "George Orwell",
        false,
    );
    assert!(score > 0);
}
