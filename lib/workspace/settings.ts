import PlatformSettingsModel from "@/models/PlatformSettings";
import UserModel from "@/models/User";
import { WorkspaceError } from "./server";
export async function ensurePlatformSettings() { const existing = await PlatformSettingsModel.findById("platform"); if (existing) return existing; const owner = await UserModel.findOne({ roles: "ADMIN", status: "ACTIVE" }).sort({ createdAt: 1, _id: 1 }).select("_id"); if (!owner) throw new WorkspaceError("An active administrator is required.", 409); return PlatformSettingsModel.findOneAndUpdate({ _id: "platform" }, { $setOnInsert: { ownerUserId: owner._id } }, { upsert: true, new: true, setDefaultsOnInsert: true }); }
