import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Allow any external aggregator (GMGN, DexScreener, etc.) to call the
        // token-metadata endpoints without CORS preflight issues.
        source: "/api/token-metadata/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  transpilePackages: ["@rainbow-me/rainbowkit"],
  // Pin the workspace root to the frontend dir so Next.js picks up the
  // local postcss.config.js / tailwind.config.ts instead of inferring
  // the monorepo root.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack(config) {
    // MetaMask SDK's browser bundle imports @react-native-async-storage/async-storage
    // which is a React Native-only package that doesn't exist in a web project.
    // Stub it out with an empty module so the warning/error disappears.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.join(
        __dirname,
        "src/lib/stubs/async-storage.js"
      ),
    };
    return config;
  },
};

export default nextConfig;