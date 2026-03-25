mod models;
mod scoring;

use std::collections::HashSet;

use models::{primary_author, to_search_item, ScoredDoc, SearchDoc, SearchResponse};
use reqwest::Client;
use scoring::score_doc;

pub use models::SearchItem;

const OPEN_LIBRARY_SEARCH_URL: &str = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_LANGUAGE_ENGLISH: &str = "eng";
const SEARCH_FIELDS: &str =
    "title,title_suggest,author_name,first_publish_year,number_of_pages_median,cover_i,key,language,edition_count";
const SEARCH_FETCH_LIMIT: usize = 24;
const SEARCH_OUTPUT_LIMIT: usize = 12;
const MIN_QUERY_LENGTH: usize = 2;

struct RankedDocsBuilder<'a> {
    author_only: bool,
    normalized_query: &'a str,
    seen: HashSet<String>,
}

struct SearchAccumulator {
    docs: Vec<SearchDoc>,
    last_error: String,
    successful_requests: usize,
}

fn normalized_search_query(query: &str) -> String {
    let normalized = query.trim();
    if normalized.len() < MIN_QUERY_LENGTH {
        return String::new();
    }
    normalized.to_string()
}

fn dedupe_key(doc: &SearchDoc) -> String {
    let doc_key = doc.key.as_deref().unwrap_or_default().trim();
    if !doc_key.is_empty() {
        return doc_key.to_string();
    }
    let title = doc.title.as_deref().unwrap_or_default().trim();
    let author = primary_author(doc);
    if title.is_empty() && author.is_empty() {
        return String::new();
    }
    format!("{title}|{author}")
}

fn title_sort_key(doc: &SearchDoc) -> String {
    doc.title.as_deref().unwrap_or_default().to_lowercase()
}

fn search_urls(query: &str, author_only: bool) -> Vec<String> {
    let encoded_query = urlencoding::encode(query);
    if author_only {
        let author_base = format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}");
        return vec![
            format!(
                "{author_base}&author={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"
            ),
            format!("{author_base}&author={encoded_query}"),
        ];
    }
    let search_base =
        format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}&fields={SEARCH_FIELDS}");
    vec![
        format!("{search_base}&q={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"),
        format!("{search_base}&author={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"),
        format!("{search_base}&title={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"),
    ]
}

fn ranked_docs(docs: Vec<SearchDoc>, normalized_query: &str, author_only: bool) -> Vec<ScoredDoc> {
    let mut builder = RankedDocsBuilder::new(normalized_query, author_only);
    let mut ranked_docs = docs
        .into_iter()
        .filter_map(|doc| builder.ranked_doc(doc))
        .collect::<Vec<_>>();
    ranked_docs.sort_by(|left, right| {
        let left_title = title_sort_key(&left.doc);
        let right_title = title_sort_key(&right.doc);
        right
            .score
            .cmp(&left.score)
            .then_with(|| left_title.cmp(&right_title))
    });
    ranked_docs
}

async fn fetched_docs(client: &Client, url: String) -> Result<Vec<SearchDoc>, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Book search failed: {error}"))?;
    let ok_response = response
        .error_for_status()
        .map_err(|error| format!("Book search failed: {error}"))?;
    let payload = ok_response
        .json::<SearchResponse>()
        .await
        .map_err(|error| format!("Unable to decode search response: {error}"))?;
    Ok(payload.docs.unwrap_or_default())
}

pub async fn search_books(query: &str, author_only: bool) -> Result<Vec<SearchItem>, String> {
    let normalized_query = normalized_search_query(query);
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }
    let client = Client::new();
    let mut accumulator = SearchAccumulator::new();
    for url in search_urls(&normalized_query, author_only) {
        accumulator.record(fetched_docs(&client, url).await);
    }
    if accumulator.successful_requests == 0 {
        return Err(accumulator.last_error);
    }
    Ok(
        ranked_docs(accumulator.docs, &normalized_query, author_only)
            .into_iter()
            .take(SEARCH_OUTPUT_LIMIT)
            .filter(|entry| {
                !entry
                    .doc
                    .title
                    .as_deref()
                    .unwrap_or_default()
                    .trim()
                    .is_empty()
            })
            .map(|entry| to_search_item(entry.doc))
            .collect(),
    )
}

impl<'a> RankedDocsBuilder<'a> {
    fn new(normalized_query: &'a str, author_only: bool) -> Self {
        Self {
            author_only,
            normalized_query,
            seen: HashSet::new(),
        }
    }

    fn ranked_doc(&mut self, doc: SearchDoc) -> Option<ScoredDoc> {
        require_unique_doc(&mut self.seen, &doc)?;
        scored_doc(doc, self.normalized_query, self.author_only)
    }
}

impl SearchAccumulator {
    fn new() -> Self {
        Self {
            docs: Vec::new(),
            last_error: String::from("Book search failed."),
            successful_requests: 0,
        }
    }

    fn record(&mut self, result: Result<Vec<SearchDoc>, String>) {
        match result {
            Ok(found_docs) => self.record_success(found_docs),
            Err(error) => self.record_error(error),
        }
    }

    fn record_error(&mut self, error: String) {
        self.last_error = error;
    }

    fn record_success(&mut self, found_docs: Vec<SearchDoc>) {
        self.docs.extend(found_docs);
        self.successful_requests += 1;
    }
}

fn require_unique_doc(seen: &mut HashSet<String>, doc: &SearchDoc) -> Option<()> {
    let key = dedupe_key(doc);
    if key.is_empty() || !seen.insert(key) {
        return None;
    }
    Some(())
}

fn scored_doc(doc: SearchDoc, normalized_query: &str, author_only: bool) -> Option<ScoredDoc> {
    let score = score_doc(&doc, normalized_query, author_only);
    if score <= 0 {
        return None;
    }
    Some(ScoredDoc { doc, score })
}
