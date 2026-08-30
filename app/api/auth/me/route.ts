import { NextResponse } from "next/server";

import { authenticateRequest, serializeUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authentication = await authenticateRequest(request);
    if (!authentication.ok) return authentication.response;

    const response = NextResponse.json({ user: serializeUser(authentication.user) });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Current-user error", error);
    return NextResponse.json({ error: "Failed to retrieve user." }, { status: 500 });
  }
}
