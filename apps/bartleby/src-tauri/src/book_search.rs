mod diagnostics;
mod fetch;
mod models;
mod scoring;
mod title_author;

use std::collections::HashSet;

use diagnostics::{
    query_too_short_response, search_request, SearchAccumulator, SearchRequest,
    REQUEST_KIND_AUTHOR, REQUEST_KIND_QUERY, REQUEST_KIND_TITLE, REQUEST_KIND_TITLE_AUTHOR,
};
use fetch::fetch_all_docs;
use models::{primary_author, to_search_item, ScoredDoc, SearchDoc};
use reqwest::Client;
use scoring::score_doc as score_search_doc;
use title_author::{
    title_author_candidates, title_author_match_score, TitleAuthorCandidate,
    TITLE_AUTHOR_REQUEST_LIMIT,
};

pub use models::{SearchItem, SearchResponse};

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
    title_author_candidates: Vec<TitleAuthorCandidate>,
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

fn search_requests(query: &str, author_only: bool) -> Vec<diagnostics::SearchRequest> {
    let encoded_query = urlencoding::encode(query);
    if author_only {
        let author_base = format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}");
        return vec![
            search_request(
                REQUEST_KIND_AUTHOR,
                format!(
                    "{author_base}&author={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"
                ),
            ),
            search_request(
                REQUEST_KIND_AUTHOR,
                format!("{author_base}&author={encoded_query}"),
            ),
        ];
    }
    let search_base =
        format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}&fields={SEARCH_FIELDS}");
    let mut requests = vec![
        search_request(
            REQUEST_KIND_QUERY,
            format!("{search_base}&q={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"),
        ),
        search_request(
            REQUEST_KIND_AUTHOR,
            format!(
                "{search_base}&author={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"
            ),
        ),
        search_request(
            REQUEST_KIND_TITLE,
            format!("{search_base}&title={encoded_query}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"),
        ),
    ];
    requests.extend(title_author_search_requests(query, &search_base));
    requests
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

fn title_author_search_requests(query: &str, search_base: &str) -> Vec<SearchRequest> {
    title_author_candidates(query)
        .into_iter()
        .take(TITLE_AUTHOR_REQUEST_LIMIT)
        .map(|candidate| title_author_search_request(search_base, &candidate))
        .collect()
}

fn title_author_search_request(
    search_base: &str,
    candidate: &TitleAuthorCandidate,
) -> SearchRequest {
    let encoded_author = urlencoding::encode(&candidate.author);
    let encoded_title = urlencoding::encode(&candidate.title);
    search_request(
        REQUEST_KIND_TITLE_AUTHOR,
        format!(
            "{search_base}&title={encoded_title}&author={encoded_author}&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}"
        ),
    )
}

fn search_items_from_ranked_docs(ranked_docs: Vec<ScoredDoc>) -> Vec<SearchItem> {
    ranked_docs
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
        .collect()
}

pub async fn search_books(query: &str, author_only: bool) -> Result<SearchResponse, String> {
    let normalized_query = normalized_search_query(query);
    if normalized_query.is_empty() {
        return Ok(query_too_short_response(MIN_QUERY_LENGTH));
    }
    let client = Client::new();
    let mut accumulator = SearchAccumulator::new();
    let requests = search_requests(&normalized_query, author_only);
    for (request, result) in fetch_all_docs(&client, requests).await {
        accumulator.record(&request, result);
    }
    if accumulator.successful_requests() == 0 {
        return Err(accumulator.failure_message());
    }
    let parsed_doc_count = accumulator.parsed_doc_count();
    let ranked = ranked_docs(accumulator.take_docs(), &normalized_query, author_only);
    let ranked_doc_count = ranked.len();
    let items = search_items_from_ranked_docs(ranked);
    if items.is_empty() {
        accumulator.record_empty_items(parsed_doc_count, ranked_doc_count);
    }
    Ok(SearchResponse {
        diagnostics: accumulator.diagnostics,
        items,
    })
}

impl<'a> RankedDocsBuilder<'a> {
    fn new(normalized_query: &'a str, author_only: bool) -> Self {
        Self {
            author_only,
            normalized_query,
            seen: HashSet::new(),
            title_author_candidates: title_author_candidates(normalized_query),
        }
    }

    fn ranked_doc(&mut self, doc: SearchDoc) -> Option<ScoredDoc> {
        require_unique_doc(&mut self.seen, &doc)?;
        let score = self.score_doc(&doc);
        positive_scored_doc(doc, score)
    }

    fn score_doc(&self, doc: &SearchDoc) -> i64 {
        score_search_doc(doc, self.normalized_query, self.author_only)
            + title_author_match_score(doc, &self.title_author_candidates)
    }
}

fn require_unique_doc(seen: &mut HashSet<String>, doc: &SearchDoc) -> Option<()> {
    let key = dedupe_key(doc);
    if key.is_empty() || !seen.insert(key) {
        return None;
    }
    Some(())
}

fn positive_scored_doc(doc: SearchDoc, score: i64) -> Option<ScoredDoc> {
    if score <= 0 {
        return None;
    }
    Some(ScoredDoc { doc, score })
}
