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
    let mut ranked_docs = Vec::new();
    let mut seen = HashSet::new();
    for doc in docs {
        let key = dedupe_key(&doc);
        if key.is_empty() || seen.contains(&key) {
            continue;
        }
        seen.insert(key);
        let score = score_doc(&doc, normalized_query, author_only);
        if score > 0 {
            ranked_docs.push(ScoredDoc { doc, score });
        }
    }
    ranked_docs.sort_by(|left, right| {
        right.score.cmp(&left.score).then_with(|| {
            left.doc
                .title
                .as_deref()
                .unwrap_or_default()
                .to_lowercase()
                .cmp(
                    &right
                        .doc
                        .title
                        .as_deref()
                        .unwrap_or_default()
                        .to_lowercase(),
                )
        })
    });
    ranked_docs
}

pub async fn search_books(query: &str, author_only: bool) -> Result<Vec<SearchItem>, String> {
    let normalized_query = normalized_search_query(query);
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }
    let client = Client::new();
    let mut docs = Vec::new();
    let mut successful_requests = 0usize;
    let mut last_error = String::from("Book search failed.");
    for url in search_urls(&normalized_query, author_only) {
        match client.get(url).send().await {
            Ok(response) => match response.error_for_status() {
                Ok(ok_response) => match ok_response.json::<SearchResponse>().await {
                    Ok(payload) => {
                        docs.extend(payload.docs.unwrap_or_default());
                        successful_requests += 1;
                    }
                    Err(error) => {
                        last_error = format!("Unable to decode search response: {error}");
                    }
                },
                Err(error) => {
                    last_error = format!("Book search failed: {error}");
                }
            },
            Err(error) => {
                last_error = format!("Book search failed: {error}");
            }
        }
    }
    if successful_requests == 0 {
        return Err(last_error);
    }
    Ok(ranked_docs(docs, &normalized_query, author_only)
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
        .collect())
}
