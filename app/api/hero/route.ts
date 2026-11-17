import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { publicHeroPlacements } from "@/lib/hero/server";
import { marketplaceError } from "@/lib/marketplace/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const placements = await publicHeroPlacements(new Date());
    return NextResponse.json({ placements, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return marketplaceError(error); }
}
