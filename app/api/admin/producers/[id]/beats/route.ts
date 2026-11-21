import { z } from "zod";
import TrackModel from "@/models/Track";
import { publicTrackFilter, serializeTracks } from "@/lib/marketplace/server";
import { requireProducerSettingsAccess } from "@/lib/producers/access";
import { getPublicProducerBeats } from "@/lib/producers/server";
import { producerBeatsSchema } from "@/lib/producers/validation";
import { idSchema } from "@/lib/workspace/validation";
import { json, workspaceError } from "@/lib/workspace/server";

export const runtime = "nodejs";
const lookupSchema = z.object({ ids: z.string().min(1).max(149) }).strict();
const lookupIdsSchema = z.array(idSchema).min(1).max(6);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireProducerSettingsAccess(request, (await context.params).id);
    if (!access.ok) return access.response;
    const query = Object.fromEntries(new URL(request.url).searchParams);
    if ("ids" in query) {
      const lookup = lookupSchema.parse(query), ids = lookupIdsSchema.parse(lookup.ids.split(","));
      const records = await TrackModel.find({ _id: { $in: ids }, producerId: access.user._id, ...publicTrackFilter }).limit(6);
      return json({ items: await serializeTracks(records) });
    }
    return json(await getPublicProducerBeats(access.user.id, producerBeatsSchema.parse(query)));
  } catch (error) {
    return workspaceError(error);
  }
}
