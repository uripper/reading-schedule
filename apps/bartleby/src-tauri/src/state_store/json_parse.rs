use serde_json::Value;

const BACKSLASH_BYTE: u8 = b'\\';
const ESCAPE_PREFIX_LENGTH: usize = 2;
const HEX_DIGIT_COUNT: usize = 4;
const HIGH_SURROGATE_END: u16 = 0xDBFF;
const HIGH_SURROGATE_START: u16 = 0xD800;
const LOW_SURROGATE_END: u16 = 0xDFFF;
const LOW_SURROGATE_START: u16 = 0xDC00;
const REPLACEMENT_ESCAPE: &str = "\\uFFFD";
const UNICODE_ESCAPE_LENGTH: usize = ESCAPE_PREFIX_LENGTH + HEX_DIGIT_COUNT;
const UNICODE_MARKER_BYTE: u8 = b'u';

pub fn parse_state_value(payload_json: &str) -> Result<Value, String> {
    match serde_json::from_str::<Value>(payload_json) {
        Ok(value) => Ok(value),
        Err(error) => parse_repaired_state_value(payload_json, error),
    }
}

fn parse_repaired_state_value(
    payload_json: &str,
    original_error: serde_json::Error,
) -> Result<Value, String> {
    let Some(repaired_json) = repaired_surrogate_escapes(payload_json) else {
        return Err(original_error.to_string());
    };
    serde_json::from_str::<Value>(&repaired_json)
        .map_err(|error| format!("{original_error}; surrogate repair failed: {error}"))
}

fn repaired_surrogate_escapes(input: &str) -> Option<String> {
    let bytes = input.as_bytes();
    let mut output = String::with_capacity(input.len());
    let mut index = 0;
    let mut changed = false;
    while index < bytes.len() {
        let step = repair_step(input, &mut output, index)?;
        index = step.next_index;
        changed = changed || step.changed;
    }
    if changed {
        return Some(output);
    }
    None
}

struct RepairStep {
    changed: bool,
    next_index: usize,
}

fn repair_step(input: &str, output: &mut String, index: usize) -> Option<RepairStep> {
    if let Some(next_index) = append_repaired_escape(input, output, index) {
        return Some(RepairStep {
            changed: true,
            next_index,
        });
    }
    let character = input[index..].chars().next()?;
    output.push(character);
    Some(RepairStep {
        changed: false,
        next_index: index + character.len_utf8(),
    })
}

fn append_repaired_escape(input: &str, output: &mut String, index: usize) -> Option<usize> {
    let code = unicode_escape_code(input, index)?;
    if is_high_surrogate(code) {
        return append_high_surrogate(input, output, index);
    }
    if is_low_surrogate(code) {
        output.push_str(REPLACEMENT_ESCAPE);
        return Some(index + UNICODE_ESCAPE_LENGTH);
    }
    None
}

fn append_high_surrogate(input: &str, output: &mut String, index: usize) -> Option<usize> {
    let next_index = index + UNICODE_ESCAPE_LENGTH;
    if low_surrogate_escape_at(input, next_index) {
        output.push_str(&input[index..next_index + UNICODE_ESCAPE_LENGTH]);
        return Some(next_index + UNICODE_ESCAPE_LENGTH);
    }
    output.push_str(REPLACEMENT_ESCAPE);
    Some(next_index)
}

fn unicode_escape_code(input: &str, index: usize) -> Option<u16> {
    if !is_unicode_escape_at(input.as_bytes(), index) {
        return None;
    }
    if !is_escape_start(input.as_bytes(), index) {
        return None;
    }
    u16::from_str_radix(
        &input[index + ESCAPE_PREFIX_LENGTH..index + UNICODE_ESCAPE_LENGTH],
        16,
    )
    .ok()
}

fn low_surrogate_escape_at(input: &str, index: usize) -> bool {
    let Some(code) = unicode_escape_code(input, index) else {
        return false;
    };
    is_low_surrogate(code)
}

fn is_unicode_escape_at(bytes: &[u8], index: usize) -> bool {
    if index + UNICODE_ESCAPE_LENGTH > bytes.len() {
        return false;
    }
    if bytes[index] != BACKSLASH_BYTE {
        return false;
    }
    if bytes[index + 1] != UNICODE_MARKER_BYTE {
        return false;
    }
    bytes[index + ESCAPE_PREFIX_LENGTH..index + UNICODE_ESCAPE_LENGTH]
        .iter()
        .all(u8::is_ascii_hexdigit)
}

fn is_escape_start(bytes: &[u8], index: usize) -> bool {
    let mut slash_count = 0;
    let mut cursor = index;
    while cursor > 0 && bytes[cursor - 1] == BACKSLASH_BYTE {
        slash_count += 1;
        cursor -= 1;
    }
    slash_count % 2 == 0
}

fn is_high_surrogate(code: u16) -> bool {
    (HIGH_SURROGATE_START..=HIGH_SURROGATE_END).contains(&code)
}

fn is_low_surrogate(code: u16) -> bool {
    (LOW_SURROGATE_START..=LOW_SURROGATE_END).contains(&code)
}

#[cfg(test)]
mod tests {
    use super::parse_state_value;

    #[test]
    fn parse_state_value_repairs_lone_low_surrogate() {
        let value =
            parse_state_value(r#"{"title":"Ã\udc81gua Viva"}"#).expect("expected repaired json");
        assert_eq!(value["title"], "Ã�gua Viva");
    }

    #[test]
    fn parse_state_value_repairs_lone_high_surrogate() {
        let value = parse_state_value(r#"{"title":"A\ud83dB"}"#).expect("expected repaired json");
        assert_eq!(value["title"], "A�B");
    }

    #[test]
    fn parse_state_value_preserves_surrogate_pairs() {
        let value =
            parse_state_value(r#"{"title":"A\ud83d\udc9aB"}"#).expect("expected parsed json");
        assert_eq!(value["title"], "A💚B");
    }
}
