import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/lib/security-headers";

const securityHeaders = buildSecurityHeaders({
  isDevelopment: process.env.NODE_ENV !== "production",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
});

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Next.js blocks cross-origin requests to dev-only resources by default.
  // This lets phones/tablets on the local network load the dev server
  // (including CSS/HMR) when testing over Wi-Fi.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  agentRules: false,
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fly.storage.tigris.dev",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
