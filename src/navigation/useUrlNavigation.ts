import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeUrlState,
  encodeUrlState,
  normalizeUrlState,
  statesEqual,
  type UrlNavigationState,
} from "./urlState";

export type HistoryMode = "push" | "replace";
export type NavigationPatch = Partial<UrlNavigationState>;

/** Build a same-page URL for navigation state, intentionally omitting hashes. */
export function buildNavigationHref(
  state: UrlNavigationState,
  pathname: string,
  _hash: string,
): string {
  return `${pathname}${encodeUrlState(state)}`;
}

export function useUrlNavigation(): [
  UrlNavigationState,
  (
    patch: NavigationPatch | ((current: UrlNavigationState) => NavigationPatch),
    mode?: HistoryMode,
  ) => void,
] {
  const [state, setState] = useState<UrlNavigationState>(() =>
    normalizeUrlState(decodeUrlState(window.location.search)),
  );
  const stateRef = useRef(state);

  const navigate = useCallback(
    (
      patch: NavigationPatch | ((current: UrlNavigationState) => NavigationPatch),
      mode: HistoryMode = "push",
    ) => {
      const current = stateRef.current;
      const resolved = typeof patch === "function" ? patch(current) : patch;
      const next = normalizeUrlState({ ...current, ...resolved });
      if (statesEqual(current, next)) return;

      const href = buildNavigationHref(next, window.location.pathname, window.location.hash);
      window.history[mode === "push" ? "pushState" : "replaceState"](
        { ethernetOnboarding: true },
        "",
        href,
      );
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  useEffect(() => {
    const onPopState = () => {
      const next = decodeUrlState(window.location.search);
      stateRef.current = next;
      setState(next);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const canonical = buildNavigationHref(state, window.location.pathname, window.location.hash);
    const current = `${window.location.pathname}${window.location.search}`;
    if (canonical !== current) {
      window.history.replaceState({ ethernetOnboarding: true }, "", canonical);
    }
  }, []);

  return [state, navigate];
}
