"use client";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
type LoadingContext = { start: (label?: string) => () => void; run: <T>(work: () => Promise<T>, label?: string) => Promise<T> };
const Context = createContext<LoadingContext | null>(null), subscribe = () => () => {};
const empty: { id: symbol; label: string }[] = [];
let tasks = empty;
const listeners = new Set<() => void>();
const subscribeTasks = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export function startGlobalLoading(label = "Please wait…") { const id = Symbol(); tasks = [...tasks, { id, label }]; listeners.forEach(listener => listener()); let released = false; return () => { if (released) return; released = true; tasks = tasks.filter(task => task.id !== id); listeners.forEach(listener => listener()); }; }
const loadingApi: LoadingContext = { start: startGlobalLoading, async run(work, label) { const done = startGlobalLoading(label); try { return await work(); } finally { done(); } } };
export function FrequencyLoader({ label = "Loading your workspace…", overlay = true }: { label?: string; overlay?: boolean }) {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  const content = <div className={overlay ? "frequency-loading-overlay" : "frequency-loading-inline"} role="status" aria-live="polite"><div className="frequency-loading-card"><div className="frequency-loading-bars" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <i key={index} style={{ animationDelay: `${index * -.09}s`, height: `${18 + (5 - Math.abs(5 - index)) * 6}px` }} />)}</div><p>{label}</p></div></div>;
  return client && overlay ? createPortal(content, document.body) : content;
}
export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const active = useSyncExternalStore(subscribeTasks, () => tasks, () => empty);
  return <Context.Provider value={loadingApi}>{children}{active.length > 0 && <FrequencyLoader label={active[active.length - 1].label} />}</Context.Provider>;
}
export function useGlobalLoading() { const value = useContext(Context); if (!value) throw new Error("GlobalLoadingProvider is required."); return value; }
