import ProducerProfileModel from "@/models/ProducerProfile";
import { requireProducerSettingsAccess } from "@/lib/producers/access";
import { producerSettingsDto } from "@/lib/producers/server";
import { saveProducerSettings } from "@/lib/producers/settings";
import { json, userDto, workspaceError } from "@/lib/workspace/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const access = await requireProducerSettingsAccess(request, (await context.params).id);
    if (!access.ok) return access.response;
    const profile = await ProducerProfileModel.findOne({ userId: access.user._id });
    return json({ profile: producerSettingsDto(profile, access.user, { privateMedia: true }), user: userDto(access.user) });
  } catch (error) {
    return workspaceError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    return await saveProducerSettings(request, (await context.params).id);
  } catch (error) {
    return workspaceError(error);
  }
}
