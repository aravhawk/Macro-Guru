interface UsageTrackerProps {
  used: number;
  limit: number;
}

export function UsageTracker({ used, limit }: UsageTrackerProps) {
  const ratio = used / limit;
  const colorClass =
    ratio >= 0.92
      ? 'text-destructive border-destructive/30'
      : ratio >= 0.72
        ? 'text-amber-500 dark:text-amber-400 border-amber-300/30 dark:border-amber-500/30'
        : 'text-muted-foreground border-border';

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border text-xs ${colorClass}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="tabular-nums font-medium">
        {used}/{limit}
      </span>
    </div>
  );
}
