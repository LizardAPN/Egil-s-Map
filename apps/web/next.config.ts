import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@imprint/api", "@imprint/types", "@imprint/ui"]
};

export default nextConfig;
