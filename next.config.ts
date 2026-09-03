import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel performs its own output tracing. Keep the standalone bundle for
  // Docker and other self-hosted deployments without conflicting with it.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ["@libsql/client"],
  outputFileTracingIncludes: {
    "/daily/*": ["./content/daily/**/*.json"],
  },
};

export default nextConfig;
