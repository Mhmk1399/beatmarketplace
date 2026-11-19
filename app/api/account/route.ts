import UserModel from "@/models/User";
import { preferencesSchema, profileSchema } from "@/lib/workspace/validation";
import { json, readJson, requireOrigin, requireUser, userDto, WorkspaceError, workspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const auth = await requireUser(request); if (!auth.ok) return auth.response; return json({ user: userDto(auth.user) }); } catch (error) { return workspaceError(error); } }
export async function PATCH(request: Request) {
  try { requireOrigin(request); const auth = await requireUser(request); if (!auth.ok) return auth.response;
    const raw = await readJson(request), preference = raw && typeof raw === "object" && "emailNotifications" in raw;
    const parsed = preference ? preferencesSchema.parse(raw) : profileSchema.parse(raw);
    const set: Record<string, unknown> = {}, unset: Record<string, 1> = {};
    if ("emailNotifications" in parsed) { set["preferences.emailNotifications"] = parsed.emailNotifications; set["preferences.showActivity"] = parsed.showActivity; }
    else { set.firstName = parsed.firstName; set.lastName = parsed.lastName; set.email = parsed.email; if (parsed.email !== auth.user.email) set.isEmailVerified = false; if (parsed.phoneNumber) set.phoneNumber = parsed.phoneNumber; else unset.phoneNumber = 1; if (parsed.phoneNumber !== (auth.user.phoneNumber ?? "")) set.isPhoneVerified = false; for (const key of ["displayName", "bio", "website"] as const) set[`profile.${key}`] = parsed[key]; if (parsed.username) set["profile.username"] = parsed.username; else unset["profile.username"] = 1; set["profile.location"] = { ...(parsed.city ? { city: parsed.city } : {}), ...(parsed.countryCode ? { countryCode: parsed.countryCode } : {}) }; }
    const saved = await UserModel.findOneAndUpdate({ _id: auth.user._id, __v: parsed.expectedVersion }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}), $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) throw new WorkspaceError("Your account changed. Refresh and try again.", 409); return json({ user: userDto(saved) });
  } catch (error) { return workspaceError(error); }
}
