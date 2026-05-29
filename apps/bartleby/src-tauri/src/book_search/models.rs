use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

const COVER_ID_MIN: i64 = 1;
const WORDS_PER_PAGE_ESTIMATE: i64 = 300;
const SOURCE_NAME: &str = "Open Library";

type ReadingSize = (Option<i64>, Option<i64>);

#[derive(Clone, Debug, Deserialize)]
pub struct SearchDoc {
    pub author_name: Option<Vec<String>>,
    pub cover_i: Option<i64>,
    pub edition_count: Option<i64>,
    pub first_publish_year: Option<i64>,
    pub key: Option<String>,
    pub language: Option<Vec<String>>,
    pub number_of_pages_median: Option<i64>,
    pub title: Option<String>,
}

#[derive(Clone, Debug)]
pub struct ScoredDoc {
    pub doc: SearchDoc,
    pub score: i64,
}

#[derive(Clone, Debug, Serialize)]
pub struct SearchItem {
    author: String,
    cover_url: String,
    openlibrary_key: String,
    pages_estimate: Option<i64>,
    source: String,
    title: String,
    words_estimate: Option<i64>,
    year: Value,
}

#[derive(Clone, Debug, Serialize)]
pub struct SearchDiagnostic {
    pub detail: String,
    pub elapsed_ms: Option<u64>,
    pub reason: String,
    pub request_kind: String,
    pub retry_after: Option<String>,
    pub status: Option<u16>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SearchResponse {
    pub diagnostics: Vec<SearchDiagnostic>,
    pub items: Vec<SearchItem>,
}

#[derive(Clone, Debug)]
pub struct SearchDocsParseResult {
    pub docs: Vec<SearchDoc>,
    pub docs_field_present: bool,
    pub raw_doc_count: usize,
    pub skipped_doc_count: usize,
}

pub fn primary_author(doc: &SearchDoc) -> String {
    doc.author_name
        .as_ref()
        .and_then(|authors| authors.first())
        .map(|author| author.trim().to_string())
        .unwrap_or_default()
}

pub fn search_docs_parse_result(payload: Value) -> SearchDocsParseResult {
    let Some(payload_object) = payload.as_object() else {
        return SearchDocsParseResult::missing_docs_field();
    };
    let Some(docs) = payload_object.get("docs").and_then(Value::as_array) else {
        return SearchDocsParseResult::missing_docs_field();
    };
    let parsed_docs = search_docs_from_array(docs);
    SearchDocsParseResult {
        raw_doc_count: docs.len(),
        skipped_doc_count: docs.len().saturating_sub(parsed_docs.len()),
        docs: parsed_docs,
        docs_field_present: true,
    }
}

#[cfg(test)]
pub fn search_docs_from_value(payload: Value) -> Vec<SearchDoc> {
    search_docs_parse_result(payload).docs
}

fn estimate_reading_size(doc: &SearchDoc) -> ReadingSize {
    match doc.number_of_pages_median.filter(|pages| *pages > 0) {
        Some(pages) => (Some(pages), Some(pages * WORDS_PER_PAGE_ESTIMATE)),
        None => (None, None),
    }
}

fn search_docs_from_array(docs: &[Value]) -> Vec<SearchDoc> {
    docs.iter().filter_map(search_doc_from_value).collect()
}

fn search_doc_from_value(value: &Value) -> Option<SearchDoc> {
    let object = value.as_object()?;
    serde_json::from_value::<SearchDoc>(Value::Object(filtered_doc_object(object))).ok()
}

fn filtered_doc_object(object: &Map<String, Value>) -> Map<String, Value> {
    object
        .iter()
        .filter(|(_, value)| {
            value.is_null() || value.is_string() || value.is_number() || value.is_array()
        })
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect()
}

pub fn to_search_item(doc: SearchDoc) -> SearchItem {
    let (pages_estimate, words_estimate) = estimate_reading_size(&doc);
    let cover_url = match doc.cover_i.unwrap_or_default() {
        cover_id if cover_id >= COVER_ID_MIN => {
            format!("https://covers.openlibrary.org/b/id/{cover_id}-L.jpg")
        }
        _ => String::new(),
    };
    let year = match doc.first_publish_year {
        Some(year_value) => Value::from(year_value),
        None => Value::String(String::new()),
    };
    SearchItem {
        author: primary_author(&doc),
        cover_url,
        openlibrary_key: doc.key.unwrap_or_default(),
        pages_estimate,
        source: SOURCE_NAME.to_string(),
        title: doc.title.unwrap_or_default(),
        words_estimate,
        year,
    }
}

impl SearchDocsParseResult {
    fn missing_docs_field() -> Self {
        Self {
            docs: Vec::new(),
            docs_field_present: false,
            raw_doc_count: 0,
            skipped_doc_count: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        primary_author, search_docs_from_value, search_docs_parse_result, to_search_item,
        SearchDoc, Value,
    };

    fn search_doc(author_name: Vec<&str>, title: Option<&str>) -> SearchDoc {
        SearchDoc {
            author_name: Some(author_name.into_iter().map(str::to_string).collect()),
            cover_i: None,
            edition_count: None,
            first_publish_year: None,
            key: None,
            language: None,
            number_of_pages_median: None,
            title: title.map(str::to_string),
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
    fn primary_author_uses_first_author_or_empty_string() {
        assert_eq!(
            primary_author(&search_doc(vec!["Cal Newport", "Ghost"], None)),
            "Cal Newport"
        );
        assert!(primary_author(&search_doc(Vec::new(), None)).is_empty());
    }

    #[test]
    fn to_search_item_keeps_cover_and_size_estimates() {
        let item = to_search_item(SearchDoc {
            author_name: Some(vec!["Frank Herbert".to_string()]),
            cover_i: Some(12),
            edition_count: Some(4),
            first_publish_year: Some(1965),
            key: Some("/works/OL1W".to_string()),
            language: Some(vec!["eng".to_string()]),
            number_of_pages_median: Some(412),
            title: Some("Dune".to_string()),
        });
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
    }
}
