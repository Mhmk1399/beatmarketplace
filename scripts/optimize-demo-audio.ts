import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { demoTracks } from "../lib/audio/demo-tracks";
import { encodePreview } from "../lib/media/preview";

const sourceNames: Record<string, string> = {
  "demo-die-trying": "Die Trying.mp3",
  "demo-qw": "qw.mp3",
  "demo-coco": "coco.mp3",
  "demo-codi": "Codi.mp3",
  "demo-lovesick": "cudi ft samiel - LoveSick mix 7.mp3"
};

async function main() {
  const outputDir = path.join(process.cwd(), "public/assets/audios/listening");
  await mkdir(outputDir, { recursive: true });
  for (const track of demoTracks) {
    const source = path.join(process.env.DEMO_AUDIO_SOURCE_DIR || path.join(process.cwd(), ".data/demo-originals"), sourceNames[track.id]);
    for (const bitrate of [128, 96] as const) {
      const target = path.join(outputDir, `${track.id}-${bitrate}.mp3`);
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await encodePreview(source, temporary, { format: "mp3", bitrate });
        await rename(temporary, target);
        await chmod(target, 0o644);
        console.log(`${track.title} ${bitrate} kbps: ${(await stat(source)).size} -> ${(await stat(target)).size} bytes`);
      } finally { await rm(temporary, { force: true }); }
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Demo optimization failed."); process.exitCode = 1; });
