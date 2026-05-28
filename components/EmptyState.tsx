import { Database } from "lucide-react";

export function EmptyState({
  title = "No data yet",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <Database className="mb-3 size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {message ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

export function SetupNotice() {
  return (
    <EmptyState
      title="Database not configured"
      message="Add your Supabase + API-Football keys to .env.local, run the schema in supabase/schema.sql, then `npm run seed` to populate teams, squads, fixtures and standings."
    />
  );
}
