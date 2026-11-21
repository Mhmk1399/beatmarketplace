import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { buildSearchIndex } from "../lib/search/matching";
import TrackModel from "../models/Track";
import PopularSearchModel, { SearchReceiptModel } from "../models/PopularSearch";
async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, maxPoolSize: 2, serverSelectionTimeoutMS: 10000 });
  await PopularSearchModel.createCollection(); await SearchReceiptModel.createCollection();
  await PopularSearchModel.createIndexes(); await SearchReceiptModel.createIndexes();
  await TrackModel.createIndexes();
  let updated = 0, skipped = 0;
  const cursor = TrackModel.find().select("title description metadata.tags __v").lean().cursor({ batchSize: 100 });
  let operations: Array<Parameters<typeof TrackModel.collection.bulkWrite>[0][number]> = [];
  async function flush() { if (!operations.length) return; const result = await TrackModel.collection.bulkWrite(operations, { ordered: false }); updated += result.matchedCount; skipped += operations.length - result.matchedCount; operations = []; }
  for await (const row of cursor) {
    const search = buildSearchIndex([row.title, ...(row.metadata.tags || []), (row.description || "").split(/\s+/).slice(0, 12).join(" ")]);
    operations.push({ updateOne: { filter: { _id: row._id, __v: row.__v ?? 0, title: row.title, description: row.description }, update: { $set: { search } } } });
    if (operations.length >= 100) await flush();
  }
  await flush(); console.log(JSON.stringify({ updated, skippedConcurrentEdits: skipped, mediaUploads: 0 }));
}
main().catch(error => { console.error(error instanceof Error ? error.name : "Search index setup failed"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
