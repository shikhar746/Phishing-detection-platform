import type { NextConfig } from "next";

// Base URL of the Express API (../api). Requests to /api/* on the web origin
// are proxied there, so the browser only ever talks to one origin and the
// API's auth cookies are first-party.
const API_ORIGIN = (process.env.API_ORIGIN ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
