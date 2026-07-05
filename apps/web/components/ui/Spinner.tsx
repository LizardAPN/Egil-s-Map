export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="app-spinner" role="status" aria-live="polite">
      <span className="app-spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
