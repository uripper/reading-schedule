use crate::book_search::models::{SearchDiagnostic, SearchDoc, SearchResponse};

pub const REQUEST_KIND_AUTHOR: &str = "author";
pub const REQUEST_KIND_QUERY: &str = "query";
pub const REQUEST_KIND_TITLE: &str = "title";
pub const REQUEST_KIND_TITLE_AUTHOR: &str = "title_author";
const REQUEST_KIND_VALIDATION: &str = "validation";
const REQUEST_KIND_RANKING: &str = "ranking";
const REASON_EMPTY_DOCS: &str = "empty_docs";
const REASON_MALFORMED_DOCS: &str = "malformed_docs";
const REASON_MISSING_DOCS: &str = "missing_docs";
const REASON_QUERY_TOO_SHORT: &str = "query_too_short";
const REASON_RATE_LIMITED: &str = "rate_limited";
const REASON_REQUEST_COMPLETED: &str = "request_completed";
const REASON_REQUEST_FAILED: &str = "request_failed";
const REASON_USABLE_ITEMS_EMPTY: &str = "usable_items_empty";
const STATUS_RATE_LIMITED: u16 = 429;

#[derive(Clone)]
pub struct SearchRequest {
    pub kind: &'static str,
    pub url: String,
}

pub struct FetchError {
    pub detail: String,
    pub elapsed_ms: u64,
    pub retry_after: Option<String>,
    pub status: Option<u16>,
}

pub struct FetchErrorContext {
    pub elapsed_ms: u64,
    pub retry_after: Option<String>,
    pub status: Option<u16>,
}

pub struct FetchedDocs {
    pub docs: Vec<SearchDoc>,
    pub docs_field_present: bool,
    pub elapsed_ms: u64,
    pub raw_doc_count: usize,
    pub retry_after: Option<String>,
    pub status: u16,
    pub skipped_doc_count: usize,
}

pub struct SearchAccumulator {
    pub diagnostics: Vec<SearchDiagnostic>,
    pub docs: Vec<SearchDoc>,
    last_error: String,
    raw_doc_count: usize,
    successful_requests: usize,
}

pub fn search_request(kind: &'static str, url: String) -> SearchRequest {
    SearchRequest { kind, url }
}

pub fn fetch_error(detail: String, context: FetchErrorContext) -> FetchError {
    FetchError {
        detail,
        elapsed_ms: context.elapsed_ms,
        retry_after: context.retry_after,
        status: context.status,
    }
}

pub fn query_too_short_response(min_query_length: usize) -> SearchResponse {
    SearchResponse {
        diagnostics: vec![diagnostic(
            REQUEST_KIND_VALIDATION,
            REASON_QUERY_TOO_SHORT,
            format!("Enter at least {min_query_length} characters before searching."),
        )],
        items: Vec::new(),
    }
}

impl SearchAccumulator {
    pub fn new() -> Self {
        Self {
            diagnostics: Vec::new(),
            docs: Vec::new(),
            last_error: String::from("Book search failed."),
            raw_doc_count: 0,
            successful_requests: 0,
        }
    }

    pub fn record(&mut self, request: &SearchRequest, result: Result<FetchedDocs, FetchError>) {
        match result {
            Ok(found_docs) => self.record_success(request.kind, found_docs),
            Err(error) => self.record_error(request.kind, error),
        }
    }

    pub fn successful_requests(&self) -> usize {
        self.successful_requests
    }

    pub fn parsed_doc_count(&self) -> usize {
        self.docs.len()
    }

    pub fn take_docs(&mut self) -> Vec<SearchDoc> {
        std::mem::take(&mut self.docs)
    }

    pub fn failure_message(&self) -> String {
        format!(
            "Book search failed after all Open Library requests. Last error: {}",
            self.last_error
        )
    }

    pub fn record_empty_items(&mut self, parsed_doc_count: usize, ranked_doc_count: usize) {
        self.diagnostics.push(diagnostic(
            REQUEST_KIND_RANKING,
            REASON_USABLE_ITEMS_EMPTY,
            format!(
                "Open Library returned {} raw docs; parsed {parsed_doc_count}; ranked {ranked_doc_count}; produced zero usable items.",
                self.raw_doc_count
            ),
        ));
    }

    fn record_error(&mut self, request_kind: &str, error: FetchError) {
        self.last_error = error.detail.clone();
        self.diagnostics
            .push(diagnostic_with_context(DiagnosticInput {
                context: DiagnosticContext {
                    elapsed_ms: Some(error.elapsed_ms),
                    retry_after: error.retry_after,
                    status: error.status,
                },
                detail: error.detail,
                request_kind,
                reason: failed_request_reason(error.status),
            }));
    }

    fn record_success(&mut self, request_kind: &str, found_docs: FetchedDocs) {
        self.diagnostics
            .extend(response_diagnostics(request_kind, &found_docs));
        self.raw_doc_count += found_docs.raw_doc_count;
        self.docs.extend(found_docs.docs);
        self.successful_requests += 1;
    }
}

fn diagnostic(request_kind: &str, reason: &str, detail: String) -> SearchDiagnostic {
    diagnostic_with_context(DiagnosticInput {
        context: DiagnosticContext::default(),
        detail,
        request_kind,
        reason,
    })
}

#[derive(Default)]
struct DiagnosticContext {
    elapsed_ms: Option<u64>,
    retry_after: Option<String>,
    status: Option<u16>,
}

struct DiagnosticInput<'a> {
    context: DiagnosticContext,
    detail: String,
    reason: &'a str,
    request_kind: &'a str,
}

fn diagnostic_with_context(input: DiagnosticInput<'_>) -> SearchDiagnostic {
    SearchDiagnostic {
        detail: input.detail,
        elapsed_ms: input.context.elapsed_ms,
        reason: input.reason.to_string(),
        request_kind: input.request_kind.to_string(),
        retry_after: input.context.retry_after,
        status: input.context.status,
    }
}

fn response_diagnostics(request_kind: &str, found_docs: &FetchedDocs) -> Vec<SearchDiagnostic> {
    let mut diagnostics = vec![completed_request_diagnostic(request_kind, found_docs)];
    if !found_docs.docs_field_present {
        diagnostics.push(diagnostic(
            request_kind,
            REASON_MISSING_DOCS,
            "Open Library response did not contain a docs array.".to_string(),
        ));
        return diagnostics;
    }
    append_empty_docs_diagnostic(&mut diagnostics, request_kind, found_docs);
    append_malformed_docs_diagnostic(&mut diagnostics, request_kind, found_docs);
    diagnostics
}

fn completed_request_diagnostic(request_kind: &str, found_docs: &FetchedDocs) -> SearchDiagnostic {
    diagnostic_with_context(DiagnosticInput {
        context: DiagnosticContext {
            elapsed_ms: Some(found_docs.elapsed_ms),
            retry_after: found_docs.retry_after.clone(),
            status: Some(found_docs.status),
        },
        detail: format!(
            "Open Library request completed in {} ms with status {}; returned {} docs and skipped {} malformed docs.",
            found_docs.elapsed_ms,
            found_docs.status,
            found_docs.raw_doc_count,
            found_docs.skipped_doc_count
        ),
        request_kind,
        reason: REASON_REQUEST_COMPLETED,
    })
}

fn failed_request_reason(status: Option<u16>) -> &'static str {
    if status == Some(STATUS_RATE_LIMITED) {
        return REASON_RATE_LIMITED;
    }
    REASON_REQUEST_FAILED
}

fn append_empty_docs_diagnostic(
    diagnostics: &mut Vec<SearchDiagnostic>,
    request_kind: &str,
    found_docs: &FetchedDocs,
) {
    if found_docs.raw_doc_count != 0 {
        return;
    }
    diagnostics.push(diagnostic(
        request_kind,
        REASON_EMPTY_DOCS,
        "Open Library response contained zero docs.".to_string(),
    ));
}

fn append_malformed_docs_diagnostic(
    diagnostics: &mut Vec<SearchDiagnostic>,
    request_kind: &str,
    found_docs: &FetchedDocs,
) {
    if found_docs.skipped_doc_count == 0 {
        return;
    }
    diagnostics.push(diagnostic(
        request_kind,
        REASON_MALFORMED_DOCS,
        format!(
            "Skipped {} malformed Open Library docs.",
            found_docs.skipped_doc_count
        ),
    ));
}
