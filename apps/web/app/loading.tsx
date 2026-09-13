export default function Loading() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="mark" aria-hidden="true">
        ab.
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
