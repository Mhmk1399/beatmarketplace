import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import StudioProductModel from "@/models/StudioProduct";
import { encryptSoundKit } from "@/lib/sound-kits/crypto";
import { putMediaFile, removeStoredAssets } from "@/lib/media/adapter";
import {
  json,
  requireOrigin,
  requireUser,
  WorkspaceError,
  workspaceError,
} from "@/lib/workspace/server";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import type { ObjectStorageAsset } from "@/models/schemas/shared";

export const runtime = "nodejs";
export const MAX_SOUND_KIT_BYTES = 40 * 1024 * 1024;
function isZip(bytes: Buffer) {
  if (
    bytes.length < 22 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    ![
      [3, 4],
      [5, 6],
      [7, 8],
    ].some(([a, b]) => bytes[2] === a && bytes[3] === b)
  )
    return false;
  const start = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= start; index--)
    if (bytes.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  if (eocd < 0 || eocd + 22 + bytes.readUInt16LE(eocd + 20) !== bytes.length)
    return false;
  const disk = bytes.readUInt16LE(eocd + 4),
    centralDisk = bytes.readUInt16LE(eocd + 6),
    entries = bytes.readUInt16LE(eocd + 10),
    centralSize = bytes.readUInt32LE(eocd + 12),
    centralOffset = bytes.readUInt32LE(eocd + 16);
  if (
    disk ||
    centralDisk ||
    entries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    centralOffset + centralSize > eocd
  )
    return false;
  return entries === 0
    ? centralSize === 0
    : centralSize >= 46 &&
        centralOffset + 4 <= eocd &&
        bytes.readUInt32LE(centralOffset) === 0x02014b50;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let directory = "",
    written: ObjectStorageAsset | null = null,
    committed = false;
  try {
    requireOrigin(request);
    const auth = await requireUser(request, "PRODUCER");
    if (!auth.ok) return auth.response;
    await consumeApiQuota("sound-kit-upload", auth.user.id, 10, 3_600_000);
    const id = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse((await context.params).id);
    const declared = Number(request.headers.get("content-length") || 0);
    const limit = MAX_SOUND_KIT_BYTES + 65_536;
    if (declared > limit || !request.body)
      throw new WorkspaceError("ZIP uploads must be 40 MB or smaller.", 413);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          void reader.cancel().catch(() => {});
          throw new WorkspaceError("ZIP uploads must be 40 MB or smaller.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("kit");
    if (
      !(file instanceof File) ||
      file.size < 4 ||
      file.size > MAX_SOUND_KIT_BYTES
    )
      throw new WorkspaceError("Choose a ZIP file up to 40 MB.", 413);
    if (
      !file.name.toLowerCase().endsWith(".zip") ||
      ![
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
      ].includes(file.type || "application/octet-stream")
    )
      throw new WorkspaceError("Only ZIP archives are supported.", 415);
    const plain = Buffer.from(await file.arrayBuffer());
    if (!isZip(plain))
      throw new WorkspaceError(
        "The uploaded file is not a valid ZIP archive.",
        422,
      );
    directory = await mkdtemp(path.join(os.tmpdir(), "kit-encrypt-"));
    const target = path.join(directory, "kit.enc");
    await writeFile(target, encryptSoundKit(plain), { mode: 0o600 });
    written = await putMediaFile(
      target,
      "kit.enc",
      file.name,
      "application/octet-stream",
    );
    const item = await StudioProductModel.findOneAndUpdate(
      { _id: id, producerId: auth.user._id, kind: "SOUND_KIT" },
      {
        $set: {
          encryptedAsset: written,
          assetName: file.name,
          assetMimeType: "application/zip",
          assetSizeBytes: file.size,
          status: "DRAFT",
        },
        $inc: { assetVersion: 1, version: 1 },
      },
      { returnDocument: "after" },
    );
    if (!item) throw new WorkspaceError("This sound kit is unavailable.", 409);
    committed = true;
    return json({
      item: {
        id: String(item._id),
        assetName: item.assetName,
        assetSizeBytes: item.assetSizeBytes,
        assetVersion: item.assetVersion,
        hasAsset: true,
        status: item.status,
        version: item.version,
      },
    });
  } catch (error) {
    if (written && !committed)
      await removeStoredAssets([written]).catch(() => undefined);
    return workspaceError(error);
  } finally {
    if (directory)
      await rm(directory, { recursive: true, force: true }).catch(
        () => undefined,
      );
  }
}
