import { searchDiscovery } from "@/lib/search/server";
import { json, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET() { try { return json(await searchDiscovery()); } catch (error) { return workspaceError(error); } }
