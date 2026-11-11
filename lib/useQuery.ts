"use client";

import { useState, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

/** A filter value seeded from the query string (read in the browser, since the site is static). */
export function useQueryParam(name: string, fallback: string): [string, (v: string) => void] {
  const fromUrl = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  return [chosen ?? fromUrl ?? fallback, setChosen];
}
