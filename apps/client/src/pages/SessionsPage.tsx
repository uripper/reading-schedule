import { useEffect, useState } from "react";
import { Card } from "@reading-schedule/ui";
import { db } from "../offline/db";

export function SessionsPage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    void db.sessions.count().then(setCount);
  }, []);

  return (
    <Card title="Sessions">
      <p>Offline-ready session store initialized (Dexie).</p>
      <p>Cached sessions on this device: {count}</p>
    </Card>
  );
}
