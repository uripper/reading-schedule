const SEARCH_FIELDS = "title,title_suggest,author_name,first_publish_year,number_of_pages_median,cover_i,key,language,edition_count";
const SEARCH_FETCH_LIMIT = 24;
const SEARCH_OUTPUT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

const HTTP_STATUS_REDIRECT_MIN = 300;
const HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE = 400;
const HTTP_STATUS_ERROR_MIN = 400;

const COVER_ID_MIN = 1;
const WORDS_PER_PAGE_ESTIMATE = 300;

const SCORE_EXACT_TITLE = 700;
const SCORE_PREFIX_TITLE = 360;
const SCORE_CONTAINS_TITLE = 240;
const SCORE_TOKEN_PREFIX = 40;
const SCORE_TOKEN_CONTAINS = 20;
const SCORE_TOKEN_AUTHOR = 12;
const SCORE_ENGLISH_LANGUAGE = 45;
const SCORE_HAS_PAGE_COUNT = 5;
const SCORE_MAX_EDITION_COUNT = 20;

const SOURCE_NAME = "Open Library";

type SearchDoc = {
  author_name?: string[];
  cover_i?: number;
  edition_count?: number;
  first_publish_year?: number;
  key?: string;
  language?: string[];
  number_of_pages_median?: number;
  title?: string;
};

type SearchResponse = {
  docs?: SearchDoc[];
};

type SearchItem = {
  author: string;
  cover_url: string;
  openlibrary_key: string;
  pages_estimate: number | null;
  source: string;
  title: string;
  words_estimate: number | null;
  year: number | "";
};

function normalizeSearchText(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim();
}

function queryTokens(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function primaryAuthor(doc: SearchDoc): string {
  if (!Array.isArray(doc.author_name) || !doc.author_name.length) {
    return "";
  }
  return String(doc.author_name[0] || "");
}

function hasEnglishLanguage(doc: SearchDoc): boolean {
  if (!Array.isArray(doc.language)) {
    return false;
  }
  return doc.language.some((code) => {
    const normalized = String(code || "").toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === "eng" || normalized.endsWith("/eng");
  });
}

function baseTitleScore(titleNorm: string, queryNorm: string): number {
  let score = 0;
  if (titleNorm === queryNorm) {
    score += SCORE_EXACT_TITLE;
  }
  if (titleNorm.startsWith(queryNorm)) {
    score += SCORE_PREFIX_TITLE;
  }
  if (titleNorm.includes(queryNorm)) {
    score += SCORE_CONTAINS_TITLE;
  }
  return score;
}

function tokenScore(titleNorm: string, authorNorm: string, tokens: string[]): number {
  let score = 0;
  tokens.forEach((token) => {
    if (titleNorm.startsWith(token)) {
      score += SCORE_TOKEN_PREFIX;
      return;
    }
    if (titleNorm.includes(token)) {
      score += SCORE_TOKEN_CONTAINS;
    }
    if (authorNorm.includes(token)) {
      score += SCORE_TOKEN_AUTHOR;
    }
  });
  return score;
}

function metadataScore(doc: SearchDoc): number {
  let score = 0;
  if (hasEnglishLanguage(doc)) {
    score += SCORE_ENGLISH_LANGUAGE;
  }
  if (Number(doc.number_of_pages_median || 0) > 0) {
    score += SCORE_HAS_PAGE_COUNT;
  }
  const editionCount = Number(doc.edition_count || 0);
  if (editionCount > 0) {
    score += Math.min(SCORE_MAX_EDITION_COUNT, editionCount);
  }
  return score;
}

function scoreDoc(doc: SearchDoc, query: string): number {
  const queryNorm = normalizeSearchText(query);
  const titleNorm = normalizeSearchText(doc.title || "");
  if (!titleNorm) {
    return 0;
  }
  const authorNorm = normalizeSearchText(primaryAuthor(doc));
  const tokens = queryTokens(query);
  return baseTitleScore(titleNorm, queryNorm) + tokenScore(titleNorm, authorNorm, tokens) + metadataScore(doc);
}

function dedupeDocs(docs: SearchDoc[]): SearchDoc[] {
  const seen = new Set<string>();
  const deduped: SearchDoc[] = [];
  docs.forEach((doc) => {
    const key = String(doc.key || "").trim();
    if (key) {
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      deduped.push(doc);
      return;
    }
    const fallback = `${String(doc.title || "").trim()}|${primaryAuthor(doc).trim()}`;
    if (!fallback.trim() || seen.has(fallback)) {
      return;
    }
    seen.add(fallback);
    deduped.push(doc);
  });
  return deduped;
}

function searchUrls(query: string): string[] {
  const encoded = encodeURIComponent(query);
  const base = `https://openlibrary.org/search.json?limit=${SEARCH_FETCH_LIMIT}&fields=${SEARCH_FIELDS}`;
  return [`${base}&q=${encoded}`, `${base}&title=${encoded}`, `${base}&title=${encoded}&language=eng`];
}

async function fetchJson(url: string): Promise<SearchResponse> {
  const response = await globalThis.fetch(url, { redirect: "follow" });
  const status = Number(response.status || 0);
  if (status >= HTTP_STATUS_REDIRECT_MIN && status < HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE) {
    throw new Error(`Unexpected redirect status (${status})`);
  }
  if (status >= HTTP_STATUS_ERROR_MIN || !response.ok) {
    throw new Error(`Request failed (${status})`);
  }
  return (await response.json()) as SearchResponse;
}

function toItem(doc: SearchDoc): SearchItem {
  const pages = Number(doc.number_of_pages_median || 0);
  let words: number | null = null;
  if (pages > 0) {
    words = pages * WORDS_PER_PAGE_ESTIMATE;
  }
  const coverId = Number(doc.cover_i || 0);
  let coverUrl = "";
  if (coverId >= COVER_ID_MIN) {
    coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  }
  return {
    author: primaryAuthor(doc),
    cover_url: coverUrl,
    openlibrary_key: String(doc.key || ""),
    pages_estimate: pages || null,
    source: SOURCE_NAME,
    title: String(doc.title || ""),
    words_estimate: words,
    year: doc.first_publish_year || "",
  };
}

export async function searchBooks(query: string): Promise<SearchItem[]> {
  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const responses = await Promise.allSettled(searchUrls(normalizedQuery).map((url) => fetchJson(url)));
  const docs: SearchDoc[] = [];
  responses.forEach((result) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value.docs)) {
      return;
    }
    result.value.docs.forEach((doc) => docs.push(doc));
  });

  const scored = dedupeDocs(docs)
    .map((doc) => ({ doc, score: scoreDoc(doc, normalizedQuery) }))
    .filter((entry) => entry.score > 0);
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return String(left.doc.title || "").localeCompare(String(right.doc.title || ""), undefined, { sensitivity: "base" });
  });

  return scored
    .slice(0, SEARCH_OUTPUT_LIMIT)
    .map((entry) => toItem(entry.doc))
    .filter((item) => Boolean(item.title));
}
