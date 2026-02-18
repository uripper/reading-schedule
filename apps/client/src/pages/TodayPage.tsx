import { useQuery } from "@tanstack/react-query";
import { Card } from "@reading-schedule/ui";
import { usePlannerAdapter } from "../components/AdapterProvider";

export function TodayPage() {
  const adapter = usePlannerAdapter();
  const stateQuery = useQuery({
    queryKey: ["state"],
    queryFn: () => adapter.loadState(),
  });

  return (
    <Card title="Today">
      <p>Cross-platform TypeScript shell is active.</p>
      {stateQuery.isPending && <p>Loading saved state...</p>}
      {stateQuery.isError && <p>Could not load state: {(stateQuery.error as Error).message}</p>}
      {stateQuery.data && (
        <p>
          Books: {stateQuery.data.books.length} · Sessions: {stateQuery.data.sessions.length}
        </p>
      )}
      {!stateQuery.data && !stateQuery.isPending && <p>No saved state found yet.</p>}
    </Card>
  );
}
