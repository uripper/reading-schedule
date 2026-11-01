use super::ranked_docs;
use crate::book_search::{editions::SearchEdition, models::SearchDoc};

const ROSE_WORK_KEY: &str = "/works/OL8996439W";

fn rose_work(edition_title: &str, edition_language: &str) -> SearchDoc {
    SearchDoc {
        author_name: Some(vec!["Umberto Eco".to_string()]),
        edition: Some(SearchEdition {
            cover_i: Some(1_055_772),
            key: Some("/books/OL9199745M".to_string()),
            language: Some(vec![edition_language.to_string()]),
            title: Some(edition_title.to_string()),
        }),
        edition_count: Some(96),
        key: Some(ROSE_WORK_KEY.to_string()),
        language: Some(vec![
            "ita".to_string(),
            "spa".to_string(),
            "eng".to_string(),
        ]),
        title: Some("Il nome della rosa".to_string()),
        ..SearchDoc::default()
    }
}

#[test]
fn translated_queries_select_the_matching_edition_title() {
    let ranked = ranked_docs(
        vec![rose_work("El nombre de la rosa", "spa")],
        "el nombre de la rosa",
        false,
    );

    assert_eq!(ranked[0].doc.title.as_deref(), Some("El nombre de la rosa"));
    assert!(ranked[0].from_edition);
}

#[test]
fn original_title_queries_keep_the_work_title() {
    let ranked = ranked_docs(
        vec![rose_work("The name of the rose", "eng")],
        "il nome della rosa",
        false,
    );

    assert_eq!(ranked[0].doc.title.as_deref(), Some("Il nome della rosa"));
    assert!(!ranked[0].from_edition);
}

#[test]
fn duplicate_works_keep_the_best_scoring_edition() {
    let ranked = ranked_docs(
        vec![
            rose_work("The name of the rose", "eng"),
            rose_work("El nombre de la rosa", "spa"),
        ],
        "el nombre de la rosa",
        false,
    );

    assert_eq!(ranked.len(), 1);
    assert_eq!(ranked[0].doc.title.as_deref(), Some("El nombre de la rosa"));
}

#[test]
fn works_without_edition_metadata_fall_back_to_work_titles() {
    let doc = SearchDoc {
        edition: None,
        ..rose_work("", "spa")
    };
    let ranked = ranked_docs(vec![doc], "el nombre de la rosa", false);

    assert_eq!(ranked[0].doc.title.as_deref(), Some("Il nome della rosa"));
    assert!(!ranked[0].from_edition);
}

#[test]
fn misspelled_author_queries_rank_only_matching_spellings() {
    let dostoevsky = SearchDoc {
        author_alternative_name: Some(vec!["Fyodor Dostoevsky".to_string()]),
        author_name: Some(vec!["Фёдор Михайлович Достоевский".to_string()]),
        key: Some("/works/OL166894W".to_string()),
        title: Some("Crime and Punishment".to_string()),
        ..SearchDoc::default()
    };
    let markham = SearchDoc {
        author_name: Some(vec!["Beryl Markham".to_string()]),
        key: Some("/works/OL2W".to_string()),
        title: Some("West with the Night".to_string()),
        ..SearchDoc::default()
    };

    let dostoevsky_ranked = ranked_docs(vec![dostoevsky, markham.clone()], "doestoevsky", true);
    let murakamy_ranked = ranked_docs(vec![markham], "murakamy", true);

    assert_eq!(dostoevsky_ranked.len(), 1);
    assert_eq!(
        dostoevsky_ranked[0].doc.key.as_deref(),
        Some("/works/OL166894W")
    );
    assert!(murakamy_ranked.is_empty());
}
