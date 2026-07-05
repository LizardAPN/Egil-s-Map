import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@imprint/api", "@imprint/types", "@imprint/ui"],
  // Segment Explorer injects dev-only client nodes that call notFound() on HMR;
  // with root Providers this corrupts the client manifest and drops /sign-in (404).
  experimental: {
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
