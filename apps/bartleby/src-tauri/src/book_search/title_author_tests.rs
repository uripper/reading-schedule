use super::{title_author_candidates, title_author_match_score};
use crate::book_search::models::SearchDoc;

fn search_doc(title: &str, author: &str) -> SearchDoc {
    SearchDoc {
        author_name: Some(vec![author.to_string()]),
        title: Some(title.to_string()),
        ..SearchDoc::default()
    }
}

#[test]
fn suffix_candidate_uses_trailing_author_tokens() {
    let candidates = title_author_candidates("Death and the King's Horseman Wole Soyinka");

    assert_eq!(candidates[0].title, "Death and the King's Horseman");
    assert_eq!(candidates[0].author, "Wole Soyinka");
}

#[test]
fn by_candidate_excludes_the_separator_from_the_author() {
    let candidates = title_author_candidates("The Brothers Karamazov by Dostojewski");

    assert_eq!(candidates[0].title, "The Brothers Karamazov");
    assert_eq!(candidates[0].author, "Dostojewski");
}

#[test]
fn suffix_candidate_rejects_plain_title_endings() {
    let candidates = title_author_candidates("Death and the King's Horseman");

    assert!(candidates.is_empty());
}

#[test]
fn match_score_requires_title_and_author() {
    let candidates = title_author_candidates("Death and the King's Horseman Wole Soyinka");
    let book = search_doc("Death and the King's Horseman", "Wole Soyinka");
    let criticism = search_doc(
        "Death and the King's Horseman and Wole Soyinka's Theater",
        "Jane Scholar",
    );

    assert!(title_author_match_score(&book, &candidates) > 0);
    assert_eq!(title_author_match_score(&criticism, &candidates), 0);
}

#[test]
fn match_score_accepts_transliterated_author_spellings() {
    let candidates = title_author_candidates("The Brothers Karamazov by Dostojewski");
    let book = search_doc("The Brothers Karamazov", "Fyodor Dostoevsky");

    assert!(title_author_match_score(&book, &candidates) > 0);
}
