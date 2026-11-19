import { getPublicProducerPage } from "@/lib/producers/server";
import { json, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const page = await getPublicProducerPage((await context.params).id); return page ? json(page) : json({ error: "Producer not found." }, 404); }
  catch (error) { return workspaceError(error); }
}
