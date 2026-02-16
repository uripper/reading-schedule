const https = require("https");

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw || "{}"));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function toItem(doc) {
  const pages = Number(doc.number_of_pages_median || 0);
  const words = pages > 0 ? pages * 300 : null;
  const author = Array.isArray(doc.author_name) ? doc.author_name[0] : "";
  const year = doc.first_publish_year || "";
  return {
    title: doc.title || "",
    author,
    year,
    pages_estimate: pages || null,
    words_estimate: words,
    source: "Open Library",
  };
}

async function searchBooks(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,first_publish_year,number_of_pages_median`;
  const json = await getJson(url);
  return (json.docs || []).map(toItem).filter((x) => x.title);
}

module.exports = { searchBooks };
