mod diagnostics;
mod display_author;
mod editions;
mod fetch;
mod models;
mod ranking;
mod requests;
mod scoring;
mod spelling_fallback;
mod title_author;
mod transliteration;

use diagnostics::{query_too_short_response, SearchAccumulator, SearchRequest};
use fetch::fetch_all_docs;
use models::{to_search_item, ScoredDoc, SearchDoc};
use ranking::ranked_docs;
use requests::{search_requests, spelling_fallback_requests};
use reqwest::Client;
use spelling_fallback::{matches_query_author, spelling_fallback_patterns};

pub use models::{SearchItem, SearchResponse};

const SEARCH_OUTPUT_LIMIT: usize = 12;
const MIN_QUERY_LENGTH: usize = 2;

struct LookupContext<'a> {
    accumulator: SearchAccumulator,
    author_only: bool,
    client: Client,
    parsed_doc_count: usize,
    query: &'a str,
}

fn normalized_search_query(query: &str) -> String {
    let normalized = query.trim();
    if normalized.len() < MIN_QUERY_LENGTH {
        return String::new();
    }
    normalized.to_string()
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
        .map(to_search_item)
        .collect()
}

async fn fetch_docs(
    context: &mut LookupContext<'_>,
    requests: Vec<SearchRequest>,
) -> Vec<SearchDoc> {
    for (request, result) in fetch_all_docs(&context.client, requests).await {
        context.accumulator.record(&request, result);
    }
    context.parsed_doc_count += context.accumulator.parsed_doc_count();
    context.accumulator.take_docs()
}

/// Retries with wildcard author spellings when the normal requests rank nothing.
async fn spelling_fallback_ranked(context: &mut LookupContext<'_>) -> Vec<ScoredDoc> {
    let patterns = spelling_fallback_patterns(context.query);
    if patterns.is_empty() {
        return Vec::new();
    }
    let docs = fetch_docs(context, spelling_fallback_requests(&patterns))
        .await
        .into_iter()
        .filter(|doc| matches_query_author(doc, context.query))
        .collect();
    ranked_docs(docs, context.query, context.author_only)
}

pub async fn search_books(query: &str, author_only: bool) -> Result<SearchResponse, String> {
    let normalized_query = normalized_search_query(query);
    if normalized_query.is_empty() {
        return Ok(query_too_short_response(MIN_QUERY_LENGTH));
    }
    let mut context = LookupContext {
        accumulator: SearchAccumulator::new(),
        author_only,
        client: Client::new(),
        parsed_doc_count: 0,
        query: &normalized_query,
    };
    let docs = fetch_docs(
        &mut context,
        search_requests(&normalized_query, author_only),
    )
    .await;
    if context.accumulator.successful_requests() == 0 {
        return Err(context.accumulator.failure_message());
    }
    let mut ranked = ranked_docs(docs, &normalized_query, author_only);
    if ranked.is_empty() {
        ranked = spelling_fallback_ranked(&mut context).await;
    }
    let ranked_doc_count = ranked.len();
    let items = search_items_from_ranked_docs(ranked);
    if items.is_empty() {
        context
            .accumulator
            .record_empty_items(context.parsed_doc_count, ranked_doc_count);
    }
    Ok(SearchResponse {
        diagnostics: context.accumulator.diagnostics,
        items,
    })
}
