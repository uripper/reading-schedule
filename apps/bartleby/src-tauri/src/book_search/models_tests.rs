use serde_json::json;

use super::{
    author_names, primary_author, search_docs_from_value, search_docs_parse_result, to_search_item,
    ScoredDoc, SearchDoc, Value,
};

fn search_doc(author_name: Vec<&str>, title: Option<&str>) -> SearchDoc {
    SearchDoc {
        author_name: Some(author_name.into_iter().map(str::to_string).collect()),
        title: title.map(str::to_string),
        ..SearchDoc::default()
    }
}

fn scored(doc: SearchDoc, from_edition: bool) -> ScoredDoc {
    ScoredDoc {
        doc,
        from_edition,
        score: 1,
    }
}

#[test]
fn search_docs_from_value_skips_malformed_rows() {
    let docs = search_docs_from_value(json!({
        "docs": [
            { "author_name": ["George Orwell"], "title": "1984" },
            "bad-doc",
            42,
            null,
            { "title": "Animal Farm", "author_name": ["George Orwell"] }
        ]
    }));
    assert_eq!(docs.len(), 2);
}

#[test]
fn search_docs_parse_result_counts_malformed_rows() {
    let result = search_docs_parse_result(json!({
        "docs": [
            { "author_name": ["George Orwell"], "title": "1984" },
            null,
            { "title": "Animal Farm", "author_name": ["George Orwell"] }
        ]
    }));
    assert!(result.docs_field_present);
    assert_eq!(result.raw_doc_count, 3);
    assert_eq!(result.skipped_doc_count, 1);
    assert_eq!(result.docs.len(), 2);
}

#[test]
fn search_docs_keep_matched_edition_metadata() {
    let docs = search_docs_from_value(json!({
        "docs": [{
            "title": "Il nome della rosa",
            "editions": { "docs": [{ "title": "El nombre de la rosa", "language": ["spa"] }] }
        }]
    }));
    let edition = docs[0].edition.as_ref().expect("edition");
    assert_eq!(edition.title.as_deref(), Some("El nombre de la rosa"));
}

#[test]
fn primary_author_uses_first_author_or_empty_string() {
    assert_eq!(
        primary_author(&search_doc(vec!["Cal Newport", "Ghost"], None)),
        "Cal Newport"
    );
    assert!(primary_author(&search_doc(Vec::new(), None)).is_empty());
}

#[test]
fn author_names_lists_primary_then_alternative_names() {
    let doc = SearchDoc {
        author_alternative_name: Some(vec!["Anton Chekhov".to_string()]),
        ..search_doc(vec!["Антон Павлович Чехов", "Editor"], None)
    };
    assert_eq!(
        author_names(&doc).collect::<Vec<_>>(),
        vec!["Антон Павлович Чехов", "Anton Chekhov"]
    );
}

#[test]
fn to_search_item_keeps_cover_and_size_estimates() {
    let item = to_search_item(scored(
        SearchDoc {
            author_name: Some(vec!["Frank Herbert".to_string()]),
            cover_i: Some(12),
            edition_count: Some(4),
            first_publish_year: Some(1965),
            key: Some("/works/OL1W".to_string()),
            language: Some(vec!["eng".to_string()]),
            number_of_pages_median: Some(412),
            title: Some("Dune".to_string()),
            ..SearchDoc::default()
        },
        false,
    ));
    let payload = serde_json::to_value(item).expect("expected search item");
    assert_eq!(
        payload.get("cover_url").and_then(Value::as_str),
        Some("https://covers.openlibrary.org/b/id/12-L.jpg")
    );
    assert_eq!(
        payload.get("pages_estimate").and_then(Value::as_i64),
        Some(412)
    );
    assert_eq!(
        payload.get("words_estimate").and_then(Value::as_i64),
        Some(123_600)
    );
    assert!(payload.get("language").is_none());
}

#[test]
fn to_search_item_reports_selected_edition_key_and_language() {
    let docs = search_docs_from_value(json!({
        "docs": [{
            "key": "/works/OL8996439W",
            "title": "El nombre de la rosa",
            "editions": { "docs": [{ "key": "/books/OL9199745M", "language": ["spa"] }] }
        }]
    }));
    let doc = docs.into_iter().next().expect("doc");
    let payload = serde_json::to_value(to_search_item(scored(doc.clone(), true)))
        .expect("expected search item");
    assert_eq!(payload.get("language").and_then(Value::as_str), Some("spa"));
    assert_eq!(
        payload.get("edition_key").and_then(Value::as_str),
        Some("/books/OL9199745M")
    );
    let work_payload =
        serde_json::to_value(to_search_item(scored(doc, false))).expect("expected search item");
    assert!(work_payload.get("edition_key").is_none());
}
