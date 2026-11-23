import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate QA builds from a developer's running Next.js server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/tracks{,/*}": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/admin/tracks{,/*}": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/media/*": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
