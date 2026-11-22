//! Checks that updating the daily book order matches sorting every book again.

use serde_json::json;

use super::book_order::BookOrder;
use super::greedy_support::indexed_books;
use super::parse::planner_input;
use super::test_support::{
    book, planner_settings, HIGHEST_PRIORITY, LOWEST_PRIORITY, MINUTES_PER_SINGLE_BLOCK_DAY,
    MONDAY_DATE, WORDS_FOR_ONE_BLOCK, WORDS_TOTAL,
};

const BOOK_COUNT: usize = 12;
const PARTIAL_READ_WORDS: f64 = 150.0;

#[test]
fn incremental_order_matches_full_sort_after_reading_and_finishing() {
    let books = (0..BOOK_COUNT)
        .map(|index| {
            let priority = HIGHEST_PRIORITY + index as i64 % LOWEST_PRIORITY;
            let words = WORDS_FOR_ONE_BLOCK + (index as i64 % 2) * WORDS_FOR_ONE_BLOCK;
            book(
                &format!("book-{index}"),
                "Book",
                priority,
                words.min(WORDS_TOTAL),
            )
        })
        .collect::<Vec<_>>();
    let input = planner_input(json!({
        "books": books,
        "settings": planner_settings(MONDAY_DATE, MONDAY_DATE, MINUTES_PER_SINGLE_BLOCK_DAY),
    }))
    .expect("expected planner input");
    let mut states = indexed_books(&input.books, &input.settings);
    let mut order = BookOrder::new(&states);
    let days: [&[usize]; 3] = [&[0, 5], &[3], &[7, 11]];
    for read_today in days {
        // The first book read each day finishes; the second only makes progress.
        states[read_today[0]].remaining = 0.0;
        for index in &read_today[1..] {
            states[*index].remaining -= PARTIAL_READ_WORDS;
        }
        order.update(&states, read_today);
        assert_eq!(order.indexes(), BookOrder::new(&states).indexes());
    }
    assert!(!order.indexes().contains(&0));
    assert!(order.indexes().contains(&5));
}
