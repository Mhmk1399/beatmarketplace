import { getPublicProducerBeats, resolvePublicProducer } from "@/lib/producers/server";
import { json, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const producer = await resolvePublicProducer((await context.params).id); if (!producer) return json({ error: "Producer not found." }, 404); return json(await getPublicProducerBeats(producer.id, Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { return workspaceError(error); }
}
