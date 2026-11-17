"use client";

import { useCallback, useSyncExternalStore } from "react";
import { discountIsActive, discountStatus } from "@/lib/marketplace/discounts";
import type { TrackDiscount } from "@/lib/marketplace/types";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let serverEpoch = 0;
let receiptTime = 0;
let secondSnapshot = 0;

/** Server-clock alignment survives wall-clock edits while this tab remains open. */
export function discountNow() {
  return serverEpoch ? serverEpoch + performance.now() - receiptTime : Date.now();
}

function emit() {
  secondSnapshot = Math.floor(discountNow() / 1000) * 1000;
  listeners.forEach((listener) => listener());
}

export function synchronizeDiscountClock(serverTime: string | null | undefined) {
  if (!serverTime) return;
  const timestamp = Date.parse(serverTime);
  if (!Number.isFinite(timestamp)) return;
  serverEpoch = timestamp;
  receiptTime = performance.now();
  emit();
}

function schedule() {
  clearTimeout(timer);
  if (!listeners.size || document.hidden) return;
  timer = setTimeout(() => { emit(); schedule(); }, 1000 - discountNow() % 1000 + 5);
}

function visibilityChanged() { if (!document.hidden) emit(); schedule(); }

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    secondSnapshot = Math.floor(discountNow() / 1000) * 1000;
    document.addEventListener("visibilitychange", visibilityChanged);
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearTimeout(timer); document.removeEventListener("visibilitychange", visibilityChanged); }
  };
}

const serverSnapshot = () => 0;
export function useDiscountSecond() { return useSyncExternalStore(subscribe, () => secondSnapshot || Math.floor(discountNow() / 1000) * 1000, serverSnapshot); }

/** Boolean snapshots keep whole cards stable while only countdown leaves tick. */
export function useDiscountActive(discount: TrackDiscount | null | undefined) {
  const snapshot = useCallback(() => discountIsActive(discount, discountNow()), [discount]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function useDiscountWindowSignature(discounts: (TrackDiscount | null | undefined)[]) {
  const snapshot = useCallback(() => discounts.map((discount) => discount ? discountStatus(discount, discountNow()) : "NONE").join("|"), [discounts]);
  return useSyncExternalStore(subscribe, snapshot, () => "");
}
