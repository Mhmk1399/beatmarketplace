import { getHomeMedia, isHomeDemo, isHomeImage } from "@/lib/home/media";
import { MediaValidationError, serveStoredAsset } from "@/lib/media/storage";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import { requireSameOrigin, securityErrorResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slot)) return missing();

  try {
    const asset = (await getHomeMedia())[slot];
    const params = new URL(request.url).searchParams;
    const version = params.get("v");
    if (!asset || (version && version !== asset.key)) return missing();
    if (isHomeImage(asset)) return await serveStoredAsset(request, asset);

    const sample = /^demo-[a-z0-9-]+-(96|128)$/.exec(slot);
    if (!sample || !isHomeDemo(asset)) return missing();
    if (params.has("quality")) return new Response(null, { status: 400 });
    requireSameOrigin(request);
    await consumeApiQuota("public-media", "all", 3000, 60_000);
    const response = await serveStoredAsset(request, asset);
    response.headers.set("X-Audio-Quality", sample[1]);
    return response;
  } catch (error) {
    const secured = securityErrorResponse(error);
    if (secured) return secured;
    if (error instanceof MediaValidationError) {
      return error.status === 404 ? missing() : new Response(null, { status: error.status });
    }
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function HEAD(request: Request, context: { params: Promise<{ slot: string }> }) {
  return GET(request, context);
}
