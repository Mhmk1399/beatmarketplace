import mongoose from "mongoose";
import TrackMetricModel from "@/models/TrackMetric";
import TrackVisitorModel from "@/models/TrackVisitor";
import { VIEW_WINDOW_MS } from "./constants";

/** The visitor gate and both counters commit together, including across multiple app instances. */
export async function recordTrackVisit(trackId: string, visitorKey: string, now = new Date()) {
  const cutoff = now.getTime() - VIEW_WINDOW_MS;
  // Concurrent first inserts can produce duplicate-key errors without a retry label.
  // The aborted transaction has no committed increments, so one bounded retry is safe.
  for (let attempt = 0; ; attempt++) {
    const session = await TrackMetricModel.db.startSession();
    try {
      return await session.withTransaction(async () => {
        // The gate update returns its previous state in one round trip. A recent
        // visit leaves the timestamp unchanged instead of extending the window.
        const visitor = await TrackVisitorModel.findOneAndUpdate({ _id: visitorKey }, [{ $set: {
          lastViewedAt: { $cond: [{ $lte: [{ $ifNull: ["$lastViewedAt", new Date(0)] }, new Date(cutoff)] }, now, "$lastViewedAt"] },
        } }], { upsert: true, returnDocument: "before", updatePipeline: true, session }).lean();
        if (visitor && visitor.lastViewedAt.getTime() > cutoff) return visitor.lastViewedAt.getTime() + VIEW_WINDOW_MS;
        await TrackMetricModel.updateOne({ _id: new mongoose.Types.ObjectId(trackId) }, {
          $inc: { views: 1, uniqueVisitors: visitor ? 0 : 1 }, $max: { lastViewedAt: now },
        }, { upsert: true, session });
        return now.getTime() + VIEW_WINDOW_MS;
      }, { timeoutMS: 4000, maxCommitTimeMS: 2000, readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } catch (error) {
      if (attempt === 0 && typeof error === "object" && error && "code" in error && error.code === 11000) continue;
      throw error;
    } finally { await session.endSession(); }
  }
}

const processState = globalThis as typeof globalThis & { beatVisitGate?: { seen: Map<string, number>; pending: Set<string> } };
const state = processState.beatVisitGate ??= { seen: new Map(), pending: new Set() };

/** Bounded memory and admission control reserve the main DB pool for browsing and checkout. */
export function acquireVisitSlot(key: string, now = Date.now()): number | "busy" | ((validUntil?: number) => void) {
  const until = state.seen.get(key);
  if (until !== undefined && until > now) return until;
  state.seen.delete(key);
  if (state.pending.has(key) || state.pending.size >= 4) return "busy" as const;
  state.pending.add(key);
  let released = false;
  return (validUntil?: number) => {
    if (released) return;
    released = true;
    state.pending.delete(key);
    if (validUntil && validUntil > now) {
      if (state.seen.size >= 10000) state.seen.delete(state.seen.keys().next().value!);
      state.seen.set(key, validUntil);
    }
  };
}
