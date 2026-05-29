use std::time::Instant;

use reqwest::{header::RETRY_AFTER, Client, Response};

use super::{
    diagnostics::{fetch_error, FetchError, FetchErrorContext, FetchedDocs, SearchRequest},
    models::search_docs_parse_result,
};

const JOIN_ERROR_ELAPSED_MS: u64 = 0;

struct ResponseMetadata {
    retry_after: Option<String>,
    status: u16,
}

pub async fn fetch_all_docs(
    client: &Client,
    requests: Vec<SearchRequest>,
) -> Vec<(SearchRequest, Result<FetchedDocs, FetchError>)> {
    let tasks = requests
        .into_iter()
        .map(|request| (request.clone(), spawn_fetch_task(client, request)))
        .collect::<Vec<_>>();
    let mut results = Vec::with_capacity(tasks.len());
    for (request, task) in tasks {
        let result = task.await.unwrap_or_else(join_error_result);
        results.push((request, result));
    }
    results
}

fn spawn_fetch_task(
    client: &Client,
    request: SearchRequest,
) -> tauri::async_runtime::JoinHandle<Result<FetchedDocs, FetchError>> {
    let task_client = client.clone();
    tauri::async_runtime::spawn(async move { fetched_docs(&task_client, &request).await })
}

async fn fetched_docs(client: &Client, request: &SearchRequest) -> Result<FetchedDocs, FetchError> {
    let started_at = Instant::now();
    let response = send_search_request(client, request, &started_at).await?;
    let metadata = validated_response_metadata(&response, &started_at)?;
    let payload = decoded_search_payload(response, &metadata, &started_at).await?;
    let parse_result = search_docs_parse_result(payload);
    Ok(FetchedDocs {
        docs: parse_result.docs,
        docs_field_present: parse_result.docs_field_present,
        elapsed_ms: elapsed_ms(&started_at),
        raw_doc_count: parse_result.raw_doc_count,
        retry_after: metadata.retry_after,
        status: metadata.status,
        skipped_doc_count: parse_result.skipped_doc_count,
    })
}

async fn send_search_request(
    client: &Client,
    request: &SearchRequest,
    started_at: &Instant,
) -> Result<Response, FetchError> {
    client.get(&request.url).send().await.map_err(|error| {
        fetch_error(
            format!("Book search failed: {error}"),
            FetchErrorContext {
                elapsed_ms: elapsed_ms(started_at),
                retry_after: None,
                status: None,
            },
        )
    })
}

fn validated_response_metadata(
    response: &Response,
    started_at: &Instant,
) -> Result<ResponseMetadata, FetchError> {
    let metadata = response_metadata(response);
    response.error_for_status_ref().map_err(|error| {
        fetch_error(
            format!("Book search failed: {error}"),
            FetchErrorContext {
                elapsed_ms: elapsed_ms(started_at),
                retry_after: metadata.retry_after.clone(),
                status: Some(metadata.status),
            },
        )
    })?;
    Ok(metadata)
}

async fn decoded_search_payload(
    response: Response,
    metadata: &ResponseMetadata,
    started_at: &Instant,
) -> Result<serde_json::Value, FetchError> {
    response.json::<serde_json::Value>().await.map_err(|error| {
        fetch_error(
            format!("Unable to decode search response: {error}"),
            FetchErrorContext {
                elapsed_ms: elapsed_ms(started_at),
                retry_after: metadata.retry_after.clone(),
                status: Some(metadata.status),
            },
        )
    })
}

fn response_metadata(response: &Response) -> ResponseMetadata {
    ResponseMetadata {
        retry_after: retry_after(response),
        status: response.status().as_u16(),
    }
}

fn retry_after(response: &Response) -> Option<String> {
    response
        .headers()
        .get(RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}

fn elapsed_ms(started_at: &Instant) -> u64 {
    u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX)
}

fn join_error_result(error: impl std::fmt::Display) -> Result<FetchedDocs, FetchError> {
    Err(fetch_error(
        format!("Book search task failed: {error}"),
        FetchErrorContext {
            elapsed_ms: JOIN_ERROR_ELAPSED_MS,
            retry_after: None,
            status: None,
        },
    ))
}
