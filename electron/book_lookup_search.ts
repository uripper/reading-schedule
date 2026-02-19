import http from "node:http";
import https from "node:https";

const MAX_REDIRECTS = 4;
const SEARCH_FIELDS = "title,title_suggest,author_name,first_publish_year,number_of_pages_median,cover_i,key,language,edition_count";
const SEARCH_FETCH_LIMIT = 24;
const SEARCH_OUTPUT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

type RawResponse = {
  body: Buffer;
};

function fetchRaw(url: string, redirects = 0): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let client: any = http;
    if (url.startsWith("https://")) {
      client = https;
    }
    client
      .get(url, (res) => {
        const status = Number(res.statusCode || 0);
        if (status >= 300 && status < 400 && res.headers.location && redirects < MAX_REDIRECTS) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          resolve(fetchRaw(next, redirects + 1));
          return;
        }
        if (status >= 400) {
          res.resume();
          reject(new Error(`Request failed (${status})`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => resolve({ body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

async function getJson(url: string): Promise<any> {
  const raw = await fetchRaw(url);
  return JSON.parse(raw.body.toString("utf8") || "{}");
}

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

function primaryAuthor(doc: any): string {
  if (!Array.isArray(doc.author_name) || !doc.author_name.length) {
    return "";
  }
  return String(doc.author_name[0] || "");
}

function hasEnglishLanguage(doc: any): boolean {
  if (!Array.isArray(doc.language)) {
    return false;
  }
  return doc.language.some((code) => {
    const text = String(code || "").toLowerCase();
    if (!text) {
      return false;
    }
    return text === "eng" || text.endsWith("/eng");
  });
}

function scoreDoc(doc: any, query: string): number {
  const queryNorm = normalizeSearchText(query);
  const tokens = queryTokens(query);
  const titleNorm = normalizeSearchText(doc.title || "");
  const authorNorm = normalizeSearchText(primaryAuthor(doc));
  let score = 0;

  if (!titleNorm) {
    return score;
  }
  if (titleNorm === queryNorm) {
    score += 700;
  }
  if (titleNorm.startsWith(queryNorm)) {
    score += 360;
  }
  if (titleNorm.includes(queryNorm)) {
    score += 240;
  }
  tokens.forEach((token) => {
    if (titleNorm.startsWith(token)) {
      score += 40;
      return;
    }
    if (titleNorm.includes(token)) {
      score += 20;
    }
    if (authorNorm.includes(token)) {
      score += 12;
    }
  });
  if (hasEnglishLanguage(doc)) {
    score += 45;
  }
  if (Number(doc.number_of_pages_median || 0) > 0) {
    score += 5;
  }
  const editionCount = Number(doc.edition_count || 0);
  if (editionCount > 0) {
    score += Math.min(20, editionCount);
  }
  return score;
}

function dedupeDocs(docs: any[]): any[] {
  const seen = new Set<string>();
  const deduped = [];
  docs.forEach((doc) => {
    const key = String(doc?.key || "").trim();
    if (key) {
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      deduped.push(doc);
      return;
    }
    const fallback = `${String(doc?.title || "").trim()}|${primaryAuthor(doc).trim()}`;
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

function toItem(doc: any) {
  const pages = Number(doc.number_of_pages_median || 0);
  const words = pages > 0 ? pages * 300 : null;
  const coverId = Number(doc.cover_i || 0);
  let coverUrl = "";
  if (coverId > 0) {
    coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  }
  return {
    title: doc.title || "",
    author: primaryAuthor(doc),
    year: doc.first_publish_year || "",
    pages_estimate: pages || null,
    words_estimate: words,
    cover_url: coverUrl,
    openlibrary_key: doc.key || "",
    source: "Open Library",
  };
}

export async function searchBooks(query: string): Promise<any[]> {
  const q = String(query || "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const responses = await Promise.allSettled(searchUrls(q).map((url) => getJson(url)));
  const docs: any[] = [];
  responses.forEach((response) => {
    if (response.status !== "fulfilled") {
      return;
    }
    const rows = response.value?.docs;
    if (!Array.isArray(rows)) {
      return;
    }
    rows.forEach((row) => docs.push(row));
  });
  const scored = dedupeDocs(docs)
    .map((doc) => ({ doc, score: scoreDoc(doc, q) }))
    .filter((row) => row.score > 0);
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return String(left.doc.title || "").localeCompare(String(right.doc.title || ""), undefined, { sensitivity: "base" });
  });
  return scored.slice(0, SEARCH_OUTPUT_LIMIT).map((row) => toItem(row.doc)).filter((item) => item.title);
}
