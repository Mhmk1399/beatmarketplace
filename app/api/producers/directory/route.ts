import { getProducerDirectory } from "@/lib/producers/server";
import { json, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { return json(await getProducerDirectory(Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { return workspaceError(error); }
}
