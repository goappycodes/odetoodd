import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: every screen is prerendered from the JSON in /data
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
