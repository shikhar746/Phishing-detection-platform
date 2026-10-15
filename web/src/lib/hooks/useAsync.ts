"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api/client";

export type AsyncState<T> =
  | { status: "loading"; data: T | undefined; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | undefined; error: string };

export type UseAsyncResult<T> = AsyncState<T> & {
  reload: () => void;
  setData: (update: (prev: T) => T) => void;
};

/**
 * Runs an async loader on mount and exposes loading / success / error state,
 * a `reload` for retry buttons, and `setData` for optimistic updates. Keeps
 * the previous data while reloading so views don't flash back to skeletons.
 */
export function useAsync<T>(loader: () => Promise<T>): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: undefined, error: null });
  const loaderRef = useRef(loader);
  const latest = useRef(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  // Only sets state from promise callbacks, so it is safe to call from an effect.
  const load = useCallback(() => {
    const id = ++latest.current;
    loaderRef.current().then(
      (data) => id === latest.current && setState({ status: "success", data, error: null }),
      (err) => id === latest.current && setState((s) => ({ status: "error", data: s.data, error: errorMessage(err) })),
    );
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ status: "loading", data: s.data, error: null }));
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback((update: (prev: T) => T) => {
    setState((s) => (s.data === undefined ? s : ({ ...s, data: update(s.data) } as AsyncState<T>)));
  }, []);

  return { ...state, reload, setData };
}
