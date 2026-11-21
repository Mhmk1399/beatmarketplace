import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

async function main() {
  loadEnvConfig(process.cwd());
  const { connectToDatabase } = await import("../lib/db");
  const { storeTrackMedia, removeStoredAssets } = await import("../lib/media/storage");
  const { default: Track } = await import("../models/Track");
  await connectToDatabase();
  const apply = process.argv.includes("--apply");
  const query = { "audio.preview.key": /\.preview\.wav$/, "audio.master.key": { $exists: true } };
  console.log(`${apply ? "Upgrading" : "Previewing upgrade of"} ${await Track.countDocuments(query)} legacy previews.`);
  for await (const track of Track.find(query).select("+audio.master").cursor()) {
    if (!apply) { console.log(`Would convert preview for ${track._id}`); continue; }
    const old = track.audio.preview!;
    const media = await storeTrackMedia({ existingMaster: track.audio.master, previewStartSeconds: track.audio.previewStartSeconds });
    try {
      // Do not overwrite a producer edit that happened during encoding. Masters and orders stay untouched.
      const updated = await Track.updateOne({ _id: track._id, __v: track.__v, "audio.preview.key": old.key }, {
        $set: { "audio.preview": media.preview }, $inc: { __v: 1 },
      });
      if (!updated.modifiedCount) {
        await removeStoredAssets([media.preview]);
        console.log(`Skipped concurrent edit for ${track._id}`);
        continue;
      }
      // Retain the previous cropped file for rollback. Its old application URL now returns 404.
      console.log(`Converted ${track._id}: ${old.sizeBytes} -> ${media.preview.sizeBytes} bytes`);
    } catch (error) { await removeStoredAssets([media.preview]).catch(() => undefined); throw error; }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Preview upgrade failed."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
