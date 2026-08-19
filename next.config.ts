import type { NextConfig } from "next";

// Vercel packages Next.js natively. Other deployments use the standalone
// server bundle produced for the Docker image.
const nextConfig: NextConfig = process.env.VERCEL
  ? {}
  : { output: "standalone" };

export default nextConfig;
