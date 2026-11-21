import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate QA builds from a developer's running Next.js server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/tracks{,/*}": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/admin/tracks{,/*}": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/media/*": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
