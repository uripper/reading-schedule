import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { searchBooks } from "./book_lookup_search";

const MAX_REDIRECTS = 4;

type RawResponse = {
  headers: http.IncomingHttpHeaders;
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
        res.on("end", () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

function extensionFor(contentType: string | undefined, parsedUrl: URL): string {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/png")) {
    return ".png";
  }
  if (ct.includes("image/webp")) {
    return ".webp";
  }
  const known = path.extname(parsedUrl.pathname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(known)) {
    if (known === ".jpeg") {
      return ".jpg";
    }
    return known;
  }
  return ".jpg";
}

function safeFileBase(bookId: string | undefined): string {
  const text = String(bookId || "").trim() || `cover-${Date.now()}`;
  return text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || `cover-${Date.now()}`;
}

async function downloadCover(
  coverUrl: string | undefined,
  bookId: string | undefined,
  userDataDir: string | undefined
): Promise<string> {
  const rawUrl = String(coverUrl || "").trim();
  if (!rawUrl || !userDataDir) {
    return "";
  }
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "";
  }

  const response = await fetchRaw(parsed.toString());
  if (!response.body?.length) {
    return "";
  }

  const ext = extensionFor(response.headers["content-type"], parsed);
  const dir = path.join(userDataDir, "book_covers");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${safeFileBase(bookId)}${ext}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, response.body);
  return pathToFileURL(filePath).href;
}

export { searchBooks, downloadCover };
