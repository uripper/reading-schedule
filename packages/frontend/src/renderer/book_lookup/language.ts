const ENGLISH_LANGUAGE_CODE = "eng";
const DISPLAY_LOCALE = "en";
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}$/;

/**
 * Open Library uses MARC (ISO 639-2/B) codes; these differ from the codes
 * `Intl.DisplayNames` understands, so map them to their ISO 639-1 form.
 */
const MARC_TO_ISO_639_1: Readonly<Record<string, string>> = {
    alb: "sq",
    arm: "hy",
    baq: "eu",
    bur: "my",
    chi: "zh",
    cze: "cs",
    dut: "nl",
    fre: "fr",
    geo: "ka",
    ger: "de",
    gre: "el",
    ice: "is",
    mac: "mk",
    may: "ms",
    per: "fa",
    rum: "ro",
    slo: "sk",
    tib: "bo",
    wel: "cy",
};

const LANGUAGE_NAMES = new Intl.DisplayNames([DISPLAY_LOCALE], {
    fallback: "code",
    type: "language",
});

/**
 * Returns a readable language name for a non-English lookup edition.
 * @param code - MARC language code reported by book search.
 * @returns Language name, or an empty string for English or unknown input.
 */
export function lookupLanguageLabel(code: string | undefined): string {
    const NORMALIZED = String(code ?? "")
        .trim()
        .toLowerCase();
    if (
        NORMALIZED === ENGLISH_LANGUAGE_CODE ||
        !LANGUAGE_CODE_PATTERN.test(NORMALIZED)
    ) {
        return "";
    }
    const DISPLAY_CODE = MARC_TO_ISO_639_1[NORMALIZED] ?? NORMALIZED;
    return LANGUAGE_NAMES.of(DISPLAY_CODE) ?? NORMALIZED;
}
