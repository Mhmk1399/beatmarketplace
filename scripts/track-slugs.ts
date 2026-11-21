import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { createReadStream } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import TrackModel from "../models/Track";
import TrackRouteModel from "../models/TrackRoute";
import { normalizeTrackSlug } from "../lib/marketplace/track-url";
import { allocateTrackSlug, trackSlugTransactionOptions } from "../lib/marketplace/track-slug-server";

type Snapshot = { id: string; title: string; slug: string; version?: number; updatedAt?: string };
async function* snapshots(file: string) {
  const lines = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  try { for await (const line of lines) if (line) yield JSON.parse(line) as Snapshot; } finally { lines.close(); }
}
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, maxPoolSize: 2, serverSelectionTimeoutMS: 10000 });
  await TrackRouteModel.createCollection(); await TrackRouteModel.createIndexes();
  const folder = path.join(process.cwd(), ".data", "track-slugs"); await mkdir(folder, { recursive: true });
  const backup = path.join(folder, `${Date.now()}-before.jsonl`), writer = await open(backup, "wx");
  let count = 0, updated = 0, unchanged = 0, skipped = 0;
  try {
    const cursor = TrackModel.find().select("title slug __v updatedAt").sort({ _id: 1 }).lean().cursor({ batchSize: 100 });
    for await (const row of cursor) {
      await writer.write(JSON.stringify({ id: String(row._id), title: row.title, slug: row.slug, version: row.__v, updatedAt: row.updatedAt?.toISOString() }) + "\n"); count++;
    }
  } finally { await writer.close(); }
  // Reserve every prior address before allocating any new name, including aliases of later rows.
  let operations: Array<Parameters<typeof TrackRouteModel.bulkWrite>[0][number]> = [];
  async function flush() { if (operations.length) await TrackRouteModel.bulkWrite(operations, { ordered: true }); operations = []; }
  for await (const row of snapshots(backup)) {
    const slug = normalizeTrackSlug(row.slug);
    if (!slug || slug.length > 200) throw new Error("A legacy beat URL needs manual review before migration.");
    const trackId = new mongoose.Types.ObjectId(row.id);
    operations.push({ updateOne: { filter: { _id: slug, trackId }, update: { $setOnInsert: { trackId, createdAt: new Date() } }, upsert: true } });
    if (operations.length >= 100) await flush();
  }
  await flush();
  for await (const row of snapshots(backup)) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const outcome = await mongoose.connection.transaction(async session => {
          const filter = { _id: new mongoose.Types.ObjectId(row.id), title: row.title, slug: row.slug, __v: typeof row.version === "number" ? row.version : { $exists: false }, ...(row.updatedAt ? { updatedAt: new Date(row.updatedAt) } : {}) };
          if (!await TrackModel.exists(filter).session(session)) return "skipped";
          const slug = await allocateTrackSlug({ id: row.id, title: row.title, previousSlug: row.slug }, session);
          if (slug === row.slug) return "unchanged";
          const result = await TrackModel.collection.updateOne(filter, { $set: { slug } }, { session });
          if (!result.matchedCount) throw new Error("A beat changed during URL migration. Rerun the migration.");
          return "updated";
        }, trackSlugTransactionOptions);
        if (outcome === "updated") updated++; else if (outcome === "unchanged") unchanged++; else skipped++;
        break;
      } catch (error) {
        if (!(typeof error === "object" && error && "code" in error && error.code === 11000) || attempt === 4) throw error;
      }
    }
    if ((updated + unchanged + skipped) % 5 === 0) console.log(JSON.stringify({ processed: updated + unchanged + skipped, count }));
  }
  console.log(JSON.stringify({ count, updated, unchanged, skippedConcurrentEdits: skipped, backup: path.relative(process.cwd(), backup), mediaWrites: 0 }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Beat URL migration failed."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
