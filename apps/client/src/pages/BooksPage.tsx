import { useState } from "react";
import { Button, Card } from "@reading-schedule/ui";
import type { BookLookupItem } from "@reading-schedule/contracts";
import { usePlannerAdapter } from "../components/AdapterProvider";

export function BooksPage() {
  const adapter = usePlannerAdapter();
  const [query, setQuery] = useState("hobbit");
  const [results, setResults] = useState<BookLookupItem[]>([]);
  const [status, setStatus] = useState("Idle");

  async function runSearch() {
    setStatus("Searching...");
    try {
      const items = await adapter.searchBooks(query);
      setResults(items);
      setStatus(`Found ${items.length} items`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <Card title="Books">
      <label>
        Search title
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => void runSearch()}>Search</Button>
      </div>
      <p>{status}</p>
      <ul>
        {results.slice(0, 5).map((item, index) => (
          <li key={`${String(item.title ?? "book")}-${index}`}>{String(item.title ?? "Untitled")}</li>
        ))}
      </ul>
    </Card>
  );
}
