import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@contentauth/c2pa-node", "sharp"],
};

export default nextConfig;
