const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { pathToFileURL } = require("url");

const MAX_REDIRECTS = 4;

function fetchRaw(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
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
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

async function getJson(url) {
  const raw = await fetchRaw(url);
  return JSON.parse(raw.body.toString("utf8") || "{}");
}

function toItem(doc) {
  const pages = Number(doc.number_of_pages_median || 0);
  const words = pages > 0 ? pages * 300 : null;
  const author = Array.isArray(doc.author_name) ? doc.author_name[0] : "";
  const year = doc.first_publish_year || "";
  const coverId = Number(doc.cover_i || 0);
  return {
    title: doc.title || "",
    author,
    year,
    pages_estimate: pages || null,
    words_estimate: words,
    cover_url: coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
    openlibrary_key: doc.key || "",
    source: "Open Library",
  };
}

async function searchBooks(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,first_publish_year,number_of_pages_median,cover_i,key`;
  const json = await getJson(url);
  return (json.docs || []).map(toItem).filter((x) => x.title);
}

function extensionFor(contentType, parsedUrl) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  const known = path.extname(parsedUrl.pathname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(known)) return known === ".jpeg" ? ".jpg" : known;
  return ".jpg";
}

function safeFileBase(bookId) {
  const text = String(bookId || "").trim() || `cover-${Date.now()}`;
  return text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || `cover-${Date.now()}`;
}

async function downloadCover(coverUrl, bookId, userDataDir) {
  const rawUrl = String(coverUrl || "").trim();
  if (!rawUrl || !userDataDir) return "";
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) return "";

  const response = await fetchRaw(parsed.toString());
  if (!response.body?.length) return "";

  const ext = extensionFor(response.headers["content-type"], parsed);
  const dir = path.join(userDataDir, "book_covers");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${safeFileBase(bookId)}${ext}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, response.body);
  return pathToFileURL(filePath).href;
}

module.exports = { searchBooks, downloadCover };
