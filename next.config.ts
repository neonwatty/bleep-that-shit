import type { NextConfig } from "next";

// Next.js configuration for bleep-that-shit
const nextConfig: NextConfig = {
  // Keep images unoptimized for WASM/Transformers.js compatibility
  images: {
    unoptimized: true,
  },
  // Skip ESLint during build - we run it separately in CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };

      // Suppress the import.meta warning from @huggingface/transformers
      config.module = {
        ...config.module,
        exprContextCritical: false,
      };
    }
    return config;
  },
};

export default nextConfig;
