import { connectToDatabase } from "@/lib/db";
import PlatformSettingsModel from "@/models/PlatformSettings";
import { contactSettings } from "./settings";
export async function publicContactSettings() { try { await connectToDatabase(); const stored = await PlatformSettingsModel.findById("platform").select("contactEmail contactPhone instagram youtube tiktok x soundcloud").lean(); if (!stored) return contactSettings; return { email: stored.contactEmail, phone: stored.contactPhone, socials: { instagram: stored.instagram, youtube: stored.youtube, tiktok: stored.tiktok, x: stored.x, soundcloud: stored.soundcloud } }; } catch { return contactSettings; } }
