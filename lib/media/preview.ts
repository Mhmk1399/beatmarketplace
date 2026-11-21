import { execFile } from "node:child_process";
import { chmod, stat } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";
import { MediaValidationError } from "./wav";

export const PREVIEW_BITRATE = 128_000;
export const MAX_PREVIEW_BYTES = 600_000;

/** Encode only the already-cropped PCM file. The encoder never receives a full master. */
export async function encodePreview(croppedWav: string, outputMp3: string, options: { bitrate?: 96 | 128; format?: "wav" | "mp3"; fullLength?: boolean } = {}) {
  const executable = process.env.FFMPEG_PATH || ffmpegPath;
  if (!executable) throw new MediaValidationError("Audio preparation is unavailable. Please contact support.", 503);
  await new Promise<void>((resolve, reject) => {
    execFile(executable, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-protocol_whitelist", "file,pipe", "-f", options.format ?? "wav", "-i", croppedWav,
      "-map", "0:a:0", "-map_metadata", "-1", "-map_chapters", "-1",
      "-vn", "-sn", "-dn", ...(options.fullLength ? [] : ["-t", "30"]), "-ac", "2", "-ar", "44100",
      "-c:a", "libmp3lame", "-b:a", `${options.bitrate ?? 128}k`, "-threads", "1",
      "-id3v2_version", "0", "-write_id3v1", "0", "-f", "mp3", outputMp3,
    ], { timeout: 60_000, killSignal: "SIGKILL", maxBuffer: 16_384, windowsHide: true }, error => {
      // Encoder output can contain local paths; keep it out of API responses/logs.
      if (error) reject(new MediaValidationError("Audio preparation failed. Please retry your upload.", 503));
      else resolve();
    });
  });
  await chmod(outputMp3, 0o600);
  const file = await stat(outputMp3);
  if (file.size < 1000 || file.size > (options.fullLength ? 60 * 1024 * 1024 : MAX_PREVIEW_BYTES)) throw new MediaValidationError("Audio preparation produced an invalid preview.", 503);
}
