use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use super::{
    display_author::display_author,
    editions::{edition_language, first_edition, SearchEdition},
};

const COVER_ID_MIN: i64 = 1;
const WORDS_PER_PAGE_ESTIMATE: i64 = 300;
const SOURCE_NAME: &str = "Open Library";

type ReadingSize = (Option<i64>, Option<i64>);

#[derive(Clone, Debug, Default, Deserialize)]
pub struct SearchDoc {
    pub author_alternative_name: Option<Vec<String>>,
    pub author_name: Option<Vec<String>>,
    pub cover_i: Option<i64>,
    #[serde(skip)]
    pub edition: Option<SearchEdition>,
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
    pub from_edition: bool,
    pub score: i64,
}

#[derive(Clone, Debug, Serialize)]
pub struct SearchItem {
    author: String,
    cover_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    edition_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
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

/// Returns the primary author followed by Open Library's alternative spellings.
pub fn author_names(doc: &SearchDoc) -> impl Iterator<Item = &str> {
    let primary = doc.author_name.iter().flatten().take(1);
    let alternatives = doc.author_alternative_name.iter().flatten();
    primary.chain(alternatives).map(String::as_str)
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
    let mut doc =
        serde_json::from_value::<SearchDoc>(Value::Object(filtered_doc_object(object))).ok()?;
    doc.edition = first_edition(object);
    Some(doc)
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

pub fn to_search_item(entry: ScoredDoc) -> SearchItem {
    let doc = entry.doc;
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
    let selected_edition = doc.edition.as_ref().filter(|_| entry.from_edition);
    SearchItem {
        author: display_author(&doc),
        cover_url,
        edition_key: selected_edition.and_then(|edition| edition.key.clone()),
        language: selected_edition.and_then(edition_language),
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
#[path = "models_tests.rs"]
mod tests;
