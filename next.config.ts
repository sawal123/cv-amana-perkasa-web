import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native image optimization needs `sharp`, which shared hosting cannot compile.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
