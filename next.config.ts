import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /yc reads a packed SQLite file through better-sqlite3 (a native addon): keep it out of
  // the bundler and make sure the database ships with the serverless functions.
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/yc": ["./data/yc.db"],
    "/yc/api/**": ["./data/yc.db"],
  },
};

export default nextConfig;
