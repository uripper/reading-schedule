//! Deterministic folding used to compare transliterated name tokens.
//!
//! Tokens are first folded to lowercase ASCII (Latin diacritics stripped,
//! Cyrillic romanized, modifier marks dropped). Tokens that still differ are
//! compared by a consonant skeleton that ignores the vowel and digraph choices
//! transliteration schemes disagree on (`Dostoevsky`, `Dostoyevsky`,
//! `Dostojewski` and `Достоевский` all share the skeleton `dstvsk`).

const MAX_EDIT_DISTANCE_DIVISOR: usize = 3;
const MIN_SKELETON_LENGTH: usize = 4;
const SKELETON_VOWELS: &str = "aeiouyj";
const SKELETON_REWRITES: &[(&str, &str)] = &[
    ("tz", "ts"),
    ("tch", "ch"),
    ("sch", "sh"),
    ("zh", "z"),
    ("kh", "k"),
    ("ck", "k"),
    ("ph", "f"),
    ("ff", "v"),
    ("w", "v"),
    ("x", "ks"),
];
const LATIN_FOLDS: &[(&str, &str)] = &[
    ("àáâãäåāăą", "a"),
    ("çćĉċč", "c"),
    ("ďđ", "d"),
    ("èéêëēĕėęě", "e"),
    ("ĝğġģ", "g"),
    ("ìíîïĩīĭįı", "i"),
    ("ĵ", "j"),
    ("ķ", "k"),
    ("ĺļľŀł", "l"),
    ("ñńņňŉ", "n"),
    ("òóôõöøōŏő", "o"),
    ("ŕŗř", "r"),
    ("śŝşš", "s"),
    ("ţťŧ", "t"),
    ("ùúûüũūŭůűų", "u"),
    ("ýÿŷ", "y"),
    ("źżž", "z"),
    ("ß", "ss"),
    ("æ", "ae"),
    ("œ", "oe"),
];
const CYRILLIC_FOLDS: &[(char, &str)] = &[
    ('а', "a"),
    ('б', "b"),
    ('в', "v"),
    ('г', "g"),
    ('д', "d"),
    ('е', "e"),
    ('ё', "e"),
    ('ж', "zh"),
    ('з', "z"),
    ('и', "i"),
    ('й', "y"),
    ('к', "k"),
    ('л', "l"),
    ('м', "m"),
    ('н', "n"),
    ('о', "o"),
    ('п', "p"),
    ('р', "r"),
    ('с', "s"),
    ('т', "t"),
    ('у', "u"),
    ('ф', "f"),
    ('х', "kh"),
    ('ц', "ts"),
    ('ч', "ch"),
    ('ш', "sh"),
    ('щ', "shch"),
    ('ы', "y"),
    ('э', "e"),
    ('ю', "yu"),
    ('я', "ya"),
];

/// Folds one token to lowercase ASCII letters and digits.
pub fn folded_token(token: &str) -> String {
    let mut folded = String::new();
    for character in token.chars().flat_map(char::to_lowercase) {
        push_folded_character(&mut folded, character);
    }
    folded
}

/// Builds the consonant skeleton used for loose transliteration matching.
pub fn transliteration_key(token: &str) -> String {
    let mut folded = folded_token(token);
    for (from, to) in SKELETON_REWRITES {
        folded = folded.replace(from, to);
    }
    let mut characters = folded.chars();
    let Some(first) = characters.next() else {
        return String::new();
    };
    let mut key = String::from(first);
    for character in characters.filter(|character| !SKELETON_VOWELS.contains(*character)) {
        push_distinct(&mut key, character);
    }
    key
}

fn push_distinct(key: &mut String, character: char) {
    if !key.ends_with(character) {
        key.push(character);
    }
}

/// Returns whether two name tokens are spellings of the same name.
pub fn tokens_match(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }
    let left_folded = folded_token(left);
    let right_folded = folded_token(right);
    if left_folded.is_empty() || right_folded.is_empty() {
        return false;
    }
    if left_folded == right_folded {
        return true;
    }
    let left_key = transliteration_key(&left_folded);
    left_key.len() >= MIN_SKELETON_LENGTH && left_key == transliteration_key(&right_folded)
}

/// Returns whether two tokens match and their folded spellings are close.
///
/// Stricter than [`tokens_match`]: short skeletons collide (`markham` and
/// `murakamy` both reduce to `mrkm`), so loose wildcard hits also need an edit
/// distance of at most a third of the longer spelling.
pub fn tokens_closely_match(left: &str, right: &str) -> bool {
    if !tokens_match(left, right) {
        return false;
    }
    let left_folded = folded_token(left);
    let right_folded = folded_token(right);
    let longest = left_folded.len().max(right_folded.len());
    edit_distance(&left_folded, &right_folded) <= longest.div_ceil(MAX_EDIT_DISTANCE_DIVISOR)
}

/// Returns whether a skeleton is long enough to be trusted for matching.
pub fn has_reliable_key(token: &str) -> bool {
    transliteration_key(token).len() >= MIN_SKELETON_LENGTH
}

fn edit_distance(left: &str, right: &str) -> usize {
    let right_chars = right.chars().collect::<Vec<_>>();
    let mut previous = (0..=right_chars.len()).collect::<Vec<_>>();
    for left_entry in left.chars().enumerate() {
        previous = next_distance_row(&previous, left_entry, &right_chars);
    }
    previous[right_chars.len()]
}

fn next_distance_row(previous: &[usize], left: (usize, char), right_chars: &[char]) -> Vec<usize> {
    let (left_index, left_char) = left;
    let mut current = vec![left_index + 1];
    for (right_index, right_char) in right_chars.iter().enumerate() {
        let substitution = previous[right_index] + usize::from(left_char != *right_char);
        let insertion = current[right_index] + 1;
        let deletion = previous[right_index + 1] + 1;
        current.push(substitution.min(insertion).min(deletion));
    }
    current
}

fn push_folded_character(folded: &mut String, character: char) {
    if character.is_ascii_alphanumeric() {
        folded.push(character);
        return;
    }
    if let Some(replacement) = folded_replacement(character) {
        folded.push_str(replacement);
    }
}

fn folded_replacement(character: char) -> Option<&'static str> {
    if let Some((_, replacement)) = CYRILLIC_FOLDS.iter().find(|(from, _)| *from == character) {
        return Some(replacement);
    }
    LATIN_FOLDS
        .iter()
        .find(|(from, _)| from.contains(character))
        .map(|(_, replacement)| *replacement)
}

#[cfg(test)]
mod tests {
    use super::{
        edit_distance, folded_token, tokens_closely_match, tokens_match, transliteration_key,
    };

    #[test]
    fn folded_token_strips_diacritics_and_modifier_marks() {
        assert_eq!(folded_token("Gogolʹ"), "gogol");
        assert_eq!(folded_token("Søren"), "soren");
        assert_eq!(folded_token("Dostoïeffsky"), "dostoieffsky");
    }

    #[test]
    fn folded_token_romanizes_cyrillic() {
        assert_eq!(folded_token("Чехов"), "chekhov");
        assert_eq!(folded_token("Пушкин"), "pushkin");
    }

    #[test]
    fn transliteration_variants_share_a_skeleton() {
        let expected = transliteration_key("Dostoevsky");
        for variant in ["Doestoevsky", "Dostoyevsky", "Dostojewski", "Достоевский"] {
            assert_eq!(transliteration_key(variant), expected, "{variant}");
        }
    }

    #[test]
    fn tokens_match_accepts_known_alias_pairs() {
        assert!(tokens_match("dostoevsky", "doestoevsky"));
        assert!(tokens_match("tolstoy", "tolstoi"));
        assert!(tokens_match("chekhov", "Чехов"));
        assert!(tokens_match("nietzsche", "nietzche"));
        assert!(tokens_match("kierkegaard", "kirkegaard"));
    }

    #[test]
    fn tokens_closely_match_rejects_distant_spellings_with_shared_skeletons() {
        assert!(tokens_closely_match("doestoevsky", "Dostoievski"));
        assert!(tokens_closely_match("solzenitsin", "Solzhenitsyn"));
        assert!(!tokens_closely_match("murakamy", "Markham"));
    }

    #[test]
    fn edit_distance_counts_single_character_edits() {
        assert_eq!(edit_distance("doestoevsky", "dostoevsky"), 1);
        assert_eq!(edit_distance("tolstoy", "tolstoy"), 0);
        assert_eq!(edit_distance("", "abc"), 3);
    }

    #[test]
    fn tokens_match_rejects_short_or_unrelated_skeletons() {
        assert!(!tokens_match("gail", "gogol"));
        assert!(!tokens_match("orwell", "tolstoy"));
        assert!(!tokens_match("", "tolstoy"));
    }
}
