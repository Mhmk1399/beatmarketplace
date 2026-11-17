"use client";

import { useCallback, useSyncExternalStore } from "react";
import { demoTracks } from "./demo-tracks";

const key = "beatmarketplace-demo-favorites-v1";
const allowed = new Set(demoTracks.map((track) => track.id));
const listeners = new Set<() => void>();
let favorites = new Set<string>();
let memoryOnly = false;

function parse(value: string | null) {
  try {
    const data: unknown = JSON.parse(value || "[]");
    return new Set(Array.isArray(data) ? data.filter((id): id is string => typeof id === "string" && allowed.has(id)).slice(0, allowed.size) : []);
  } catch { return new Set<string>(); }
}
function publish(next: Set<string>) {
  if (next.size === favorites.size && [...next].every((id) => favorites.has(id))) return;
  favorites = next;
  listeners.forEach((listener) => listener());
}
function storage(event: StorageEvent) {
  try { if (event.storageArea === window.localStorage && (event.key === key || event.key === null)) publish(parse(event.newValue)); } catch { /* Storage access can be denied by the browser. */ }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    try { if (!memoryOnly) publish(parse(localStorage.getItem(key))); } catch { /* In-memory favorites remain usable when storage is blocked. */ }
    window.addEventListener("storage", storage);
  }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", storage); };
}

export function toggleDemoFavorite(id: string) {
  if (!allowed.has(id)) return { persistent: false };
  // Read the current tab-shared value before writing, including changes from another tab.
  let next = new Set(favorites);
  try { if (!memoryOnly) next = parse(localStorage.getItem(key)); } catch { /* Use the session state. */ }
  if (next.has(id)) next.delete(id); else next.add(id);
  let persistent = true;
  try { localStorage.setItem(key, JSON.stringify([...next])); memoryOnly = false; } catch { persistent = false; memoryOnly = true; }
  publish(next);
  return { persistent };
}

const serverSnapshot = () => false;
export function useDemoFavorite(id: string) {
  const snapshot = useCallback(() => favorites.has(id), [id]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
