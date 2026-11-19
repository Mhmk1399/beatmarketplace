import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { MediaValidationError, serveStoredAsset } from "@/lib/media/storage";
import { getTaxonomyModel } from "@/lib/marketplace/taxonomy";
import { taxonomyKindSchema } from "@/lib/marketplace/validation";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string; slot: string }> }) {
  try {
    const { id, slot } = await params;
    const kind = taxonomyKindSchema.safeParse(new URL(request.url).searchParams.get("kind") ?? "genres");
    if (!kind.success) return new NextResponse(null, { status: 400 });
    if (!/^[a-f\d]{24}$/i.test(id) || (slot !== "thumbnail" && slot !== "banner")) return new NextResponse(null, { status: 404 });
    await connectToDatabase();
    const genre = await getTaxonomyModel(kind.data).findById(id).select(`isActive ${slot}`).lean();
    if (!genre) return new NextResponse(null, { status: 404 });
    if (!genre.isActive) {
      const auth = await authenticateRequest(request);
      if (!auth.ok || !auth.user.roles.includes("ADMIN")) return new NextResponse(null, { status: 404 });
    }
    const asset = genre[slot], version = new URL(request.url).searchParams.get("v");
    if (!asset || (version && version !== asset.key)) return new NextResponse(null, { status: 404 });
    return await serveStoredAsset(request, asset);
  } catch (error) {
    if ((error instanceof MediaValidationError && error.status === 404) || (error instanceof Error && "code" in error && error.code === "ENOENT")) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ error: "This category image is temporarily unavailable." }, { status: 503 });
  }
}
export async function HEAD(request: Request, context: { params: Promise<{ id: string; slot: string }> }) { return GET(request, context); }
