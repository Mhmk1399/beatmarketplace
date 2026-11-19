import { z } from "zod";
import { idSchema } from "./validation";
import { WorkspaceError } from "./server";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";
export const collectionSchema = z.object({ name: z.string().trim().min(1, "Enter a collection name.").max(100), description: z.string().trim().max(1000).default(""), trackIds: z.array(idSchema).max(100).default([]) }).strict();
export const collectionPatchSchema = collectionSchema.extend({ expectedVersion: z.number().int().min(1) });
export async function validateCollectionTracks(ids: string[], previouslySelected: string[] = []) { const added = ids.filter(id => !previouslySelected.includes(id)); if (!added.length) return; const tracks = await TrackModel.find({ _id: { $in: added }, status: "PUBLISHED", visibility: "PUBLIC" }).select("producerId"); if (tracks.length !== new Set(added).size) throw new WorkspaceError("One of the selected beats is no longer available."); const producerIds = [...new Set(tracks.map(track => String(track.producerId)))]; if (await UserModel.countDocuments({ _id: { $in: producerIds }, roles: "PRODUCER", status: "ACTIVE" }) !== producerIds.length) throw new WorkspaceError("One of the selected producers is unavailable."); }
export function collectionDto(value: { _id: unknown; name: string; description: string; trackIds: unknown[]; version: number; createdAt: Date }) { return { id: String(value._id), name: value.name, description: value.description, trackIds: value.trackIds.map(String), version: value.version, createdAt: value.createdAt.toISOString() }; }
