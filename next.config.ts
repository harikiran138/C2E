import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Ensure that the app works correctly on Vercel
  // No "output: export" - we want a standard dynamic deployment
};

export default nextConfig;
