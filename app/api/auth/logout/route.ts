import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth";
import { requireSameOrigin, securityErrorResponse } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return clearAuthCookie(NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) { return securityErrorResponse(error)!; }
}
