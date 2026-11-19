import ProducerProfileModel from "@/models/ProducerProfile";
import { json, requireUser, workspaceError } from "@/lib/workspace/server";
import { producerSettingsDto } from "@/lib/producers/server";
import { saveProducerSettings } from "@/lib/producers/settings";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const auth = await requireUser(request, "PRODUCER"); if (!auth.ok) return auth.response; const profile = await ProducerProfileModel.findOne({ userId: auth.user._id }); return json({ profile: producerSettingsDto(profile, auth.user) }); } catch (error) { return workspaceError(error); } }
export const PATCH = saveProducerSettings;
