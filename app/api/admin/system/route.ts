import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { mediaS3Client } from "@/lib/media/adapter";
import { localMediaRoot, mediaDriver, s3Configuration } from "@/lib/media/config";
import { json, requireOrigin, requireUser, workspaceError, WorkspaceError } from "@/lib/workspace/server";
export const runtime = "nodejs";
async function inspect(request: Request, write: boolean) {
  let key: string | undefined;
  let localDiagnostic: string | undefined;
  let driver: ReturnType<typeof mediaDriver> | undefined;
  try {
    if (write) requireOrigin(request);
    const auth = await requireUser(request, "ADMIN");
    if (!auth.ok) return auth.response;
    const started = Date.now();
    await mongoose.connection.db!.command({ ping: 1 });
    const databaseMs = Date.now() - started;
    driver = mediaDriver();
    const storageStarted = Date.now();
    const bytes = Buffer.from(`BeatMarketplace diagnostic ${randomUUID()}`);

    if (driver === "local") {
      const root = localMediaRoot();
      if (write) {
        await mkdir(/* turbopackIgnore: true */ root, { recursive: true });
        localDiagnostic = path.join(root, `.diagnostic-${randomUUID()}.txt`);
        await writeFile(/* turbopackIgnore: true */ localDiagnostic, bytes, { flag: "wx", mode: 0o600 });
        const returned = await readFile(/* turbopackIgnore: true */ localDiagnostic);
        if (!returned.equals(bytes)) throw new WorkspaceError("Storage verification failed.", 503);
        await unlink(/* turbopackIgnore: true */ localDiagnostic);
        localDiagnostic = undefined;
      } else if (!(await stat(/* turbopackIgnore: true */ root)).isDirectory()) {
        throw new WorkspaceError("The local media path is not a directory.", 503);
      }
    } else {
      const config = s3Configuration();
      const client = mediaS3Client();
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      if (write) {
        key = `${config.prefix}/diagnostics/${randomUUID()}.txt`;
        await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: bytes, ContentType: "text/plain", CacheControl: "private, no-store" }));
        const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        const returned = await result.Body?.transformToByteArray();
        if (!returned || !Buffer.from(returned).equals(bytes)) throw new WorkspaceError("Storage verification failed.", 503);
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
        key = undefined;
      }
    }
    return json({ database: true, databaseMs, storage: true, storageMs: Date.now() - storageStarted, driver, writeVerified: write, checkedAt: new Date().toISOString() });
  } catch (error) {
    return workspaceError(error);
  } finally {
    if (localDiagnostic) await unlink(/* turbopackIgnore: true */ localDiagnostic).catch(() => undefined);
    if (key && driver === "s3") {
      const config = s3Configuration();
      await mediaS3Client().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })).catch(() => undefined);
    }
  }
}
export async function GET(request: Request) { return inspect(request, false); }
export async function POST(request: Request) { return inspect(request, true); }
