import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // don’t fail the build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // don’t fail the build on TS type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
