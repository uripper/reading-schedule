use super::{
    diagnostics::{
        search_request, SearchRequest, REQUEST_KIND_AUTHOR, REQUEST_KIND_AUTHOR_SPELLING,
        REQUEST_KIND_QUERY, REQUEST_KIND_QUERY_ALL_LANGUAGES, REQUEST_KIND_TITLE,
        REQUEST_KIND_TITLE_AUTHOR,
    },
    title_author::{title_author_candidates, TitleAuthorCandidate, TITLE_AUTHOR_REQUEST_LIMIT},
};

const OPEN_LIBRARY_SEARCH_URL: &str = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_LANGUAGE_ENGLISH: &str = "eng";
const SEARCH_FIELDS: &str = "title,title_suggest,author_name,author_alternative_name,first_publish_year,number_of_pages_median,cover_i,key,language,edition_count,editions,editions.key,editions.title,editions.language,editions.cover_i";
const SEARCH_FETCH_LIMIT: usize = 24;
const SORT_BY_EDITIONS: &str = "editions";

/// Builds the Open Library requests for one lookup.
pub fn search_requests(query: &str, author_only: bool) -> Vec<SearchRequest> {
    if author_only {
        return author_search_requests(query);
    }
    let search_base =
        format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}&fields={SEARCH_FIELDS}");
    let encoded_query = urlencoding::encode(query);
    let english = format!("&language={OPEN_LIBRARY_LANGUAGE_ENGLISH}");
    // The unfiltered request goes first so its edition wins ranking ties; the
    // English filter also narrows each work's matched edition to English.
    let mut requests = vec![
        search_request(
            REQUEST_KIND_QUERY_ALL_LANGUAGES,
            format!("{search_base}&q={encoded_query}"),
        ),
        search_request(
            REQUEST_KIND_QUERY,
            format!("{search_base}&q={encoded_query}{english}"),
        ),
        search_request(
            REQUEST_KIND_AUTHOR,
            format!("{search_base}&author={encoded_query}{english}"),
        ),
        search_request(
            REQUEST_KIND_TITLE,
            format!("{search_base}&title={encoded_query}{english}"),
        ),
    ];
    requests.extend(title_author_search_requests(query, &search_base));
    requests
}

/// Builds sorted wildcard author searches for the spelling fallback.
pub fn spelling_fallback_requests(patterns: &[String]) -> Vec<SearchRequest> {
    let search_base = format!(
        "{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}&sort={SORT_BY_EDITIONS}&fields={SEARCH_FIELDS}"
    );
    patterns
        .iter()
        .map(|pattern| {
            let encoded = urlencoding::encode(&format!("author:{pattern}")).into_owned();
            search_request(
                REQUEST_KIND_AUTHOR_SPELLING,
                format!("{search_base}&q={encoded}"),
            )
        })
        .collect()
}

fn author_search_requests(query: &str) -> Vec<SearchRequest> {
    let author_base = format!("{OPEN_LIBRARY_SEARCH_URL}?limit={SEARCH_FETCH_LIMIT}");
    let encoded_query = urlencoding::encode(query);
    vec![
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
    ]
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

#[cfg(test)]
mod tests {
    use super::{search_requests, spelling_fallback_requests};
    use crate::book_search::diagnostics::{
        REQUEST_KIND_AUTHOR_SPELLING, REQUEST_KIND_QUERY_ALL_LANGUAGES,
    };

    #[test]
    fn title_searches_include_an_unfiltered_language_request_with_editions() {
        let requests = search_requests("el nombre de la rosa", false);
        let unfiltered = requests
            .iter()
            .find(|request| request.kind == REQUEST_KIND_QUERY_ALL_LANGUAGES)
            .expect("unfiltered request");

        assert!(!unfiltered.url.contains("language="));
        assert!(unfiltered.url.contains("editions.title"));
    }

    #[test]
    fn spelling_fallback_requests_search_authors_by_wildcard_sorted_by_editions() {
        let requests = spelling_fallback_requests(&["d*st*vsk*".to_string()]);

        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].kind, REQUEST_KIND_AUTHOR_SPELLING);
        assert!(requests[0].url.contains("sort=editions"));
        assert!(requests[0].url.contains("q=author%3Ad%2Ast%2Avsk%2A"));
    }
}
