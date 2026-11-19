import { connectToDatabase } from "@/lib/db";
import { serveStoredAsset } from "@/lib/media/delivery";
import { idSchema } from "@/lib/workspace/validation";
import { json, workspaceError } from "@/lib/workspace/server";
import UserModel from "@/models/User";
import ProducerProfileModel from "@/models/ProducerProfile";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string; slot: string }> }) {
  try {
    const { id, slot } = await context.params;
    if (!idSchema.safeParse(id).success || !["avatar", "banner"].includes(slot)) return json({ error: "Image not found." }, 404);
    await connectToDatabase();
    const user = await UserModel.findOne({ _id: id, roles: "PRODUCER", status: "ACTIVE" }).select("profile.avatar");
    if (!user) return json({ error: "Image not found." }, 404);
    const asset = slot === "avatar" ? user.profile?.avatar : (await ProducerProfileModel.findOne({ userId: user._id }).select("banner"))?.banner;
    return asset ? serveStoredAsset(request, asset) : json({ error: "Image not found." }, 404);
  } catch (error) { return workspaceError(error); }
}
export const HEAD = GET;
