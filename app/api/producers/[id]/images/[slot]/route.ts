import { connectToDatabase } from "@/lib/db";
import { serveStoredAsset } from "@/lib/media/delivery";
import { idSchema } from "@/lib/workspace/validation";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string; slot: string }> }) {
  try {
    const { id, slot } = await context.params;
    if (!idSchema.safeParse(id).success || !["avatar", "banner"].includes(slot)) return json({ error: "Image not found." }, 404);
    const privateMedia = new URL(request.url).searchParams.get("private") === "1";
    if (privateMedia) {
      const auth = await requireUser(request);
      if (!auth.ok) return auth.response;
      if (!auth.user.roles.includes("ADMIN") && (auth.user.id !== id || !auth.user.roles.includes("PRODUCER"))) return json({ error: "Image not found." }, 404);
    } else await connectToDatabase();
    const user = await UserModel.findOne({ _id: id, roles: "PRODUCER", ...(!privateMedia ? { status: "ACTIVE" } : {}) }).select("profile.avatar");
    if (!user) return json({ error: "Image not found." }, 404);
    const asset = slot === "avatar" ? user.profile?.avatar : (await ProducerProfileModel.findOne({ userId: user._id }).select("banner"))?.banner;
    const version = new URL(request.url).searchParams.get("v");
    if (asset && version && version !== asset.key) return json({ error: "Image not found." }, 404);
    return asset ? serveStoredAsset(request, asset) : json({ error: "Image not found." }, 404);
  } catch (error) { return workspaceError(error); }
}
export const HEAD = GET;
