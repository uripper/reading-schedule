//! Keeps the greedy planner's daily book order without re-sorting every book every day.
//!
//! A book's place in the order depends only on fixed book fields and its
//! remaining words, and remaining words change only for books read that day.
//! So after each day the order drops finished books and re-inserts just the
//! books read that day, instead of sorting the whole library again. Finished
//! books can never be started, so leaving them out does not change any plan.

use std::cmp::Ordering;

use crate::native_planner::greedy_support::{deadline_sort_key, progress_order, GreedyBookState};
use crate::native_planner::models::priority_order;

/// Unfinished book indexes in the order the planner offers them each day.
pub struct BookOrder {
    indexes: Vec<usize>,
}

impl BookOrder {
    pub fn new(books: &[GreedyBookState<'_>]) -> Self {
        let mut indexes = (0..books.len())
            .filter(|index| books[*index].remaining > 0.0)
            .collect::<Vec<_>>();
        indexes.sort_by(|left, right| compare_books(books, *left, *right));
        Self { indexes }
    }

    pub fn indexes(&self) -> &[usize] {
        &self.indexes
    }

    /// Repositions books read today; `read_today` lists every book whose remaining words changed.
    pub fn update(&mut self, books: &[GreedyBookState<'_>], read_today: &[usize]) {
        if read_today.is_empty() {
            return;
        }
        self.indexes.retain(|index| !read_today.contains(index));
        for index in read_today.iter().copied() {
            if books[index].remaining <= 0.0 {
                continue;
            }
            let position = self
                .indexes
                .partition_point(|other| compare_books(books, *other, index) == Ordering::Less);
            self.indexes.insert(position, index);
        }
    }
}

/// Priority, then progress, deadline, remaining words and ID; the ID makes the order total.
fn compare_books(books: &[GreedyBookState<'_>], left: usize, right: usize) -> Ordering {
    let left_state = &books[left];
    let right_state = &books[right];
    let left_book = left_state.book;
    let right_book = right_state.book;
    let deadline_order =
        deadline_sort_key(left_book.deadline).cmp(&deadline_sort_key(right_book.deadline));
    let progress_comparison = progress_order(
        (left_book, left_state.remaining),
        (right_book, right_state.remaining),
    );
    let remaining_order = left_state
        .remaining
        .partial_cmp(&right_state.remaining)
        .unwrap_or(Ordering::Equal);
    priority_order(left_book.priority, right_book.priority)
        .then(progress_comparison)
        .then(deadline_order)
        .then(remaining_order)
        .then_with(|| left_book.book_id.cmp(&right_book.book_id))
}
