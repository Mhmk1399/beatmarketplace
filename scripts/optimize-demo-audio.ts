import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { demoTracks } from "../lib/audio/demo-tracks";
import { encodePreview } from "../lib/media/preview";

async function main() {
  const outputDir = path.join(process.cwd(), "public/assets/audios/listening");
  await mkdir(outputDir, { recursive: true });
  for (const track of demoTracks) {
    const source = path.join(process.cwd(), "public", decodeURIComponent(track.downloadSrc || track.src));
    for (const bitrate of [128, 96] as const) {
      const target = path.join(outputDir, `${track.id}-${bitrate}.mp3`);
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await encodePreview(source, temporary, { format: "mp3", bitrate, fullLength: true });
        await rename(temporary, target);
        await chmod(target, 0o644);
        console.log(`${track.title} ${bitrate} kbps: ${(await stat(source)).size} -> ${(await stat(target)).size} bytes`);
      } finally { await rm(temporary, { force: true }); }
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Demo optimization failed."); process.exitCode = 1; });
