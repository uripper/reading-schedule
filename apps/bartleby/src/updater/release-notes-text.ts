/**
 * Turns Markdown release notes into plain text for the update dialog, which
 * renders notes with preserved line breaks rather than as Markdown.
 */

const FALLBACK_NOTES = "A newer Bartleby release is available.";
const HEADING_PATTERN = /^#{1,6}\s+/;
const BULLET_PATTERN = /^(\s*)[-*]\s+/;
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;
const LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;
const BULLET_MARK = "• ";

/** Rewrites one Markdown line as readable plain text. */
function plainLine(line: string): string {
    const WITHOUT_INLINE = line
        .replace(BOLD_PATTERN, "$1")
        .replace(LINK_PATTERN, "$1");
    if (HEADING_PATTERN.test(WITHOUT_INLINE)) {
        return WITHOUT_INLINE.replace(HEADING_PATTERN, "");
    }
    return WITHOUT_INLINE.replace(BULLET_PATTERN, `$1${BULLET_MARK}`);
}

/**
 * Converts release notes from the update manifest into dialog text.
 * @param body - Markdown notes from the release, if any.
 * @returns Plain-text notes, or a generic message when none were published.
 */
export function plainReleaseNotes(body: string | undefined): string {
    const TRIMMED = String(body ?? "").trim();
    if (TRIMMED === "") {
        return FALLBACK_NOTES;
    }
    return TRIMMED.split("\n").map(plainLine).join("\n");
}
