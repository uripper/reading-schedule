use std::collections::HashMap;

use super::{
    editions::edition_view,
    models::{primary_author, ScoredDoc, SearchDoc},
    scoring::score_doc,
    title_author::{title_author_candidates, title_author_match_score, TitleAuthorCandidate},
};

struct QueryScorer {
    query: String,
    title_author_candidates: Vec<TitleAuthorCandidate>,
}

struct RankedDocsBuilder {
    author_only: bool,
    best: HashMap<String, ScoredDoc>,
    scorer: QueryScorer,
}

/// Scores, dedupes, and orders docs against the query.
///
/// Each work keeps its best-scoring view: the work itself or its matched
/// edition, so a translated edition title wins when it fits the query better.
pub fn ranked_docs(docs: Vec<SearchDoc>, query: &str, author_only: bool) -> Vec<ScoredDoc> {
    let mut builder = RankedDocsBuilder::new(query, author_only);
    for doc in docs {
        add_doc(&mut builder, doc);
    }
    let mut ranked = builder.best.into_values().collect::<Vec<_>>();
    ranked.sort_by(|left, right| {
        right
            .score
            .cmp(&left.score)
            .then_with(|| title_sort_key(&left.doc).cmp(&title_sort_key(&right.doc)))
            .then_with(|| dedupe_key(&left.doc).cmp(&dedupe_key(&right.doc)))
    });
    ranked
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

impl RankedDocsBuilder {
    fn new(query: &str, author_only: bool) -> Self {
        Self {
            author_only,
            best: HashMap::new(),
            scorer: QueryScorer {
                query: query.to_string(),
                title_author_candidates: title_author_candidates(query),
            },
        }
    }
}

fn add_doc(builder: &mut RankedDocsBuilder, doc: SearchDoc) {
    let key = dedupe_key(&doc);
    if key.is_empty() {
        return;
    }
    let Some(candidate) = best_view(builder, doc) else {
        return;
    };
    let is_better = builder
        .best
        .get(&key)
        .is_none_or(|current| candidate.score > current.score);
    if is_better {
        builder.best.insert(key, candidate);
    }
}

fn best_view(builder: &RankedDocsBuilder, doc: SearchDoc) -> Option<ScoredDoc> {
    let work_score = builder_score(builder, &doc);
    let edition = edition_view(&doc)
        .map(|view| (builder_score(builder, &view), view))
        .filter(|(score, _)| *score > work_score);
    let scored = match edition {
        Some((score, view)) => ScoredDoc {
            doc: view,
            from_edition: true,
            score,
        },
        None => ScoredDoc {
            doc,
            from_edition: false,
            score: work_score,
        },
    };
    Some(scored).filter(|entry| entry.score > 0)
}

fn builder_score(builder: &RankedDocsBuilder, doc: &SearchDoc) -> i64 {
    query_score(&builder.scorer, doc, builder.author_only)
}

fn query_score(scorer: &QueryScorer, doc: &SearchDoc, author_only: bool) -> i64 {
    score_doc(doc, &scorer.query, author_only)
        + title_author_match_score(doc, &scorer.title_author_candidates)
}

#[cfg(test)]
#[path = "ranking_tests.rs"]
mod tests;
