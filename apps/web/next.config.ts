import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@imprint/types", "@imprint/api", "@imprint/ui"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
