//! Chooses the author name shown for a result.
//!
//! Open Library often stores the primary author in the original script (for
//! example `Антон Павлович Чехов`). When the primary name is not Latin script,
//! the result shows the alternative Open Library name whose surname and first
//! name spellings are most common among the alternatives, preferring plain
//! ASCII and normal capitalization (`Anton Chekhov`). Latin-script primary
//! names are always shown unchanged.

use std::collections::HashMap;

use super::{
    models::{primary_author, SearchDoc},
    transliteration::folded_token,
};

const LATIN_SCRIPT_END: char = '\u{0300}';
const MIN_NAME_WORDS: usize = 2;

type NameRank = (usize, usize, usize, bool, bool);

#[derive(Default)]
struct NameCounts {
    exact: HashMap<String, usize>,
    first: HashMap<String, usize>,
    surname: HashMap<String, usize>,
}

/// Returns the author name to display for a search result.
pub fn display_author(doc: &SearchDoc) -> String {
    let primary = primary_author(doc);
    if is_latin_script(&primary) {
        return primary;
    }
    let alternatives = latin_alternatives(doc);
    let counts = name_counts(&alternatives);
    alternatives
        .iter()
        .filter(|name| is_readable_name(name))
        .max_by_key(|name| name_rank(name, &counts))
        .cloned()
        .unwrap_or(primary)
}

fn is_latin_script(name: &str) -> bool {
    name.chars()
        .all(|character| !character.is_alphabetic() || character < LATIN_SCRIPT_END)
}

fn latin_alternatives(doc: &SearchDoc) -> Vec<String> {
    doc.author_alternative_name
        .iter()
        .flatten()
        .map(|name| name.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|name| !name.is_empty() && is_latin_script(name))
        .collect()
}

fn is_readable_name(name: &str) -> bool {
    name.split_whitespace().count() >= MIN_NAME_WORDS && !name.contains(',') && !name.contains('.')
}

/// Splits `First Last` or `Last, First` into folded (first, surname) parts.
fn name_parts(name: &str) -> (String, String) {
    let (surname_part, first_part) = match name.split_once(',') {
        Some((surname, first)) => (surname, first),
        None => name
            .rsplit_once(' ')
            .map_or((name, ""), |(first, last)| (last, first)),
    };
    let first = first_part.split_whitespace().next().unwrap_or_default();
    let surname = surname_part.split_whitespace().last().unwrap_or_default();
    (folded_token(first), folded_token(surname))
}

fn name_counts(names: &[String]) -> NameCounts {
    let mut counts = NameCounts::default();
    for name in names {
        let (first, surname) = name_parts(name);
        *counts.exact.entry(name.clone()).or_default() += 1;
        *counts.first.entry(first).or_default() += 1;
        *counts.surname.entry(surname).or_default() += 1;
    }
    counts
}

fn name_rank(name: &str, counts: &NameCounts) -> NameRank {
    let (first, surname) = name_parts(name);
    let has_shouted_word = name
        .split_whitespace()
        .any(|word| word.chars().count() > 1 && word == word.to_uppercase());
    (
        counts.surname.get(&surname).copied().unwrap_or_default(),
        counts.first.get(&first).copied().unwrap_or_default(),
        counts.exact.get(name).copied().unwrap_or_default(),
        name.is_ascii(),
        !has_shouted_word,
    )
}

#[cfg(test)]
mod tests {
    use super::{display_author, name_parts};
    use crate::book_search::models::SearchDoc;

    fn doc(primary: &str, alternatives: &[&str]) -> SearchDoc {
        SearchDoc {
            author_alternative_name: Some(
                alternatives.iter().map(|name| name.to_string()).collect(),
            ),
            author_name: Some(vec![primary.to_string()]),
            ..SearchDoc::default()
        }
    }

    #[test]
    fn latin_primary_names_are_kept() {
        let gogol = doc("Nikolaĭ Vasilʹevich  Gogolʹ", &["Nikolai Gogol"]);

        assert_eq!(display_author(&gogol), "Nikolaĭ Vasilʹevich  Gogolʹ");
    }

    #[test]
    fn cyrillic_primary_names_use_the_most_common_latin_spelling() {
        let chekhov = doc(
            "Антон Павлович Чехов",
            &[
                "Antón Chékhov",
                "Anton Chekhov",
                "Chekhov, Anton",
                "A. P. Chekhov",
                "Anton Cehov",
                "ANTON CHEKHOV",
                "Чехов",
            ],
        );

        assert_eq!(display_author(&chekhov), "Anton Chekhov");
    }

    #[test]
    fn names_without_latin_alternatives_fall_back_to_the_primary_name() {
        assert_eq!(
            display_author(&doc("Лев Толстой", &["Толстой"])),
            "Лев Толстой"
        );
        assert_eq!(
            display_author(&doc("Лев Толстой", &["Tolstoy"])),
            "Лев Толстой"
        );
    }

    #[test]
    fn name_parts_handles_comma_and_plain_order() {
        assert_eq!(
            name_parts("Chekhov, Anton Pavlovich"),
            ("anton".to_string(), "chekhov".to_string())
        );
        assert_eq!(
            name_parts("Anton Chekhov"),
            ("anton".to_string(), "chekhov".to_string())
        );
    }
}
