import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { checkAudioDelivery } from "../lib/audio/delivery-check";

async function main() {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  const value = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  if (args.includes("--help")) { console.log("npm run audio:verify -- --url https://your-app.example [--output report.json]"); return; }
  const report = await checkAudioDelivery(value("--url") || process.env.APP_URL || "http://localhost:3000");
  console.log(JSON.stringify(report, null, 2));
  const output = value("--output");
  if (output) {
    await mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  if (!report.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Audio verification failed."); process.exitCode = 1; });
