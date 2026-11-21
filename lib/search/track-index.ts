import type { Schema } from "mongoose";
import { buildSearchIndex } from "./matching";

function strings(record: Record<string, unknown>) {
  const metadata = record.metadata as { tags?: string[] } | undefined;
  return [String(record.title || ""), ...(metadata?.tags || []), String(record.description || "").split(/\s+/).slice(0, 12).join(" ")];
}
export function installTrackSearch(schema: Schema) {
  schema.add({ search: { tokens: { type: [String], default: [] }, grams: { type: [String], default: [] } } });
  schema.index({ "search.tokens": 1, status: 1, visibility: 1 }, { name: "search_track_tokens" });
  schema.index({ "search.grams": 1, status: 1, visibility: 1 }, { name: "search_track_grams" });
  schema.pre("validate", function () { this.set("search", buildSearchIndex(strings(this.toObject()))); });
  for (const operation of ["findOneAndUpdate", "updateOne"] as const) schema.pre(operation, async function () {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return;
    const set = (update.$set ?? update) as Record<string, unknown>;
    if (!["title", "description", "metadata", "metadata.tags"].some(key => key in set)) return;
    const current = await this.model.findOne(this.getFilter()).select("title description metadata.tags").lean() as Record<string, unknown> | null;
    const next = { ...current, ...set };
    if ("metadata.tags" in set) next.metadata = { ...(current?.metadata as object), tags: set["metadata.tags"] };
    const search = buildSearchIndex(strings(next));
    this.setUpdate(update.$set ? { ...update, $set: { ...update.$set, search } } : { $set: { ...update, search } });
  });
}
