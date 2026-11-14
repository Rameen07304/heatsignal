import { useEffect, useReducer, useState } from "react";

interface AsyncState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

/** Run `fn` on mount and whenever `deps` change; `retry()` re-runs it. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true });
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let live = true;
    setState({ loading: true });
    fn().then(
      (data) => live && setState({ data, loading: false }),
      (e) =>
        live &&
        setState({ error: e instanceof Error ? e : new Error(String(e)), loading: false }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, retry };
}
