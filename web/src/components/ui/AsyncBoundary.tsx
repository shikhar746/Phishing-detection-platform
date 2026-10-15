import { cn } from "@/lib/cn";
import type { UseAsyncResult } from "@/lib/hooks/useAsync";
import { ErrorState, LoadingState } from "./States";

interface Props<T> {
  state: UseAsyncResult<T>;
  /** Skeleton shown on the first load. */
  loading: React.ReactNode;
  loadingLabel: string;
  errorTitle?: string;
  /** Shown instead of `children` when `isEmpty(data)` is true. */
  empty?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  className?: string;
  children: (data: T) => React.ReactNode;
}

/**
 * The one place a data view decides between skeleton, error, empty and
 * content. Once data has loaded, a reload keeps it on screen (dimmed) instead
 * of flashing back to the skeleton, and a failed reload keeps the last data.
 */
export function AsyncBoundary<T>({ state, loading, loadingLabel, errorTitle, empty, isEmpty, className, children }: Props<T>) {
  const { data, status, error, reload } = state;

  if (data === undefined) {
    return status === "error" ? (
      <ErrorState title={errorTitle} message={error} onRetry={reload} className={className} />
    ) : (
      <LoadingState label={loadingLabel} className={className}>
        {loading}
      </LoadingState>
    );
  }

  if (empty && isEmpty?.(data)) return <>{empty}</>;

  return <div className={cn("transition-opacity", status === "loading" && "opacity-60", className)}>{children(data)}</div>;
}
