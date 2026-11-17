import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate QA builds from a developer's running Next.js server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
