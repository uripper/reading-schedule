//! Edition-level metadata returned alongside Open Library work results.
//!
//! Search requests ask for `editions.*` fields, so each work carries the
//! edition that best matched the query. When that edition's title matches the
//! query better than the work title (for example a translated title), ranking
//! uses an edition view of the doc so the translated title, cover, and language
//! reach the add-book form instead of the original-language work. The view keeps
//! the work's language list for scoring because Open Library edition language
//! tags are often wrong; the edition language is only reported, never scored.

use serde::Deserialize;
use serde_json::Value;

use super::models::SearchDoc;

const EDITIONS_FIELD: &str = "editions";
const EDITION_DOCS_FIELD: &str = "docs";

#[derive(Clone, Debug, Default, Deserialize, PartialEq)]
pub struct SearchEdition {
    pub cover_i: Option<i64>,
    pub key: Option<String>,
    pub language: Option<Vec<String>>,
    pub title: Option<String>,
}

/// Parses the best-matching edition from a raw work doc, ignoring bad shapes.
pub fn first_edition(work: &serde_json::Map<String, Value>) -> Option<SearchEdition> {
    let edition = work
        .get(EDITIONS_FIELD)?
        .get(EDITION_DOCS_FIELD)?
        .as_array()?
        .first()?;
    serde_json::from_value::<SearchEdition>(edition.clone()).ok()
}

/// Returns the doc as seen through its matched edition, when that differs.
pub fn edition_view(doc: &SearchDoc) -> Option<SearchDoc> {
    let edition = doc.edition.as_ref()?;
    let title = display_title(edition.title.as_deref()?);
    if title.is_empty() || Some(title.as_str()) == doc.title.as_deref() {
        return None;
    }
    Some(SearchDoc {
        cover_i: edition.cover_i.or(doc.cover_i),
        title: Some(title),
        ..doc.clone()
    })
}

/// Returns the first language code recorded for an edition.
pub fn edition_language(edition: &SearchEdition) -> Option<String> {
    edition
        .language
        .as_ref()?
        .first()
        .map(|code| code.trim().to_lowercase())
        .filter(|code| !code.is_empty())
}

fn display_title(title: &str) -> String {
    title.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{edition_language, edition_view, first_edition, SearchEdition};
    use crate::book_search::models::SearchDoc;

    fn spanish_edition() -> SearchEdition {
        SearchEdition {
            cover_i: Some(77),
            key: Some("/books/OL9199745M".to_string()),
            language: Some(vec!["spa".to_string()]),
            title: Some("El  nombre de la rosa".to_string()),
        }
    }

    #[test]
    fn first_edition_reads_nested_edition_docs() {
        let work = json!({
            "editions": { "docs": [{ "key": "/books/OL1M", "title": "Dune", "language": ["eng"] }] }
        });
        let edition = first_edition(work.as_object().expect("object")).expect("edition");
        assert_eq!(edition.key.as_deref(), Some("/books/OL1M"));
        assert_eq!(edition_language(&edition).as_deref(), Some("eng"));
    }

    #[test]
    fn first_edition_ignores_missing_or_malformed_editions() {
        for work in [
            json!({}),
            json!({ "editions": "bad" }),
            json!({ "editions": { "docs": [] } }),
        ] {
            assert_eq!(first_edition(work.as_object().expect("object")), None);
        }
    }

    #[test]
    fn edition_view_uses_translated_title_and_cover() {
        let doc = SearchDoc {
            cover_i: Some(12),
            edition: Some(spanish_edition()),
            language: Some(vec!["ita".to_string(), "spa".to_string()]),
            title: Some("Il nome della rosa".to_string()),
            ..SearchDoc::default()
        };
        let view = edition_view(&doc).expect("edition view");
        assert_eq!(view.title.as_deref(), Some("El nombre de la rosa"));
        assert_eq!(view.cover_i, Some(77));
        assert_eq!(view.language, doc.language);
    }

    #[test]
    fn edition_view_skips_matching_or_missing_titles() {
        let same_title = SearchDoc {
            edition: Some(SearchEdition {
                title: Some("Dune".to_string()),
                ..SearchEdition::default()
            }),
            title: Some("Dune".to_string()),
            ..SearchDoc::default()
        };
        assert_eq!(edition_view(&same_title).map(|doc| doc.title), None);
        assert_eq!(
            edition_view(&SearchDoc::default()).map(|doc| doc.title),
            None
        );
    }
}
