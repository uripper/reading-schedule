use serde::{Deserialize, Serialize};
use serde_json::Value;

const COVER_ID_MIN: i64 = 1;
const WORDS_PER_PAGE_ESTIMATE: i64 = 300;
const SOURCE_NAME: &str = "Open Library";

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

#[derive(Clone, Debug, Deserialize)]
pub struct SearchResponse {
    pub docs: Option<Vec<SearchDoc>>,
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

pub fn primary_author(doc: &SearchDoc) -> String {
    doc.author_name
        .as_ref()
        .and_then(|authors| authors.first())
        .map(|author| author.trim().to_string())
        .unwrap_or_default()
}

fn estimate_reading_size(doc: &SearchDoc) -> (Option<i64>, Option<i64>) {
    match doc.number_of_pages_median.filter(|pages| *pages > 0) {
        Some(pages) => (Some(pages), Some(pages * WORDS_PER_PAGE_ESTIMATE)),
        None => (None, None),
    }
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
