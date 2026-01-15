import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Rewrite /@username to /j/username for cleaner URLs
        source: "/@:username",
        destination: "/j/:username",
      },
    ];
  },
};

export default nextConfig;
