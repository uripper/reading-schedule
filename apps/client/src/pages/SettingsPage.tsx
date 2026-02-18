import { useState } from "react";
import { Button, Card } from "@reading-schedule/ui";

export function SettingsPage() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  return (
    <Card title="Settings">
      <p>Theme preference (placeholder for persisted settings): {theme}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => setTheme("system")}>System</Button>
        <Button onClick={() => setTheme("light")}>Light</Button>
        <Button onClick={() => setTheme("dark")}>Dark</Button>
      </div>
    </Card>
  );
}
