import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
