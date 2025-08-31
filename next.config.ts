import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  // Configure for GitHub Pages deployment
  output: 'export',
  basePath: isProd ? basePath : '',
  assetPrefix: isProd ? basePath : '',
  images: {
    unoptimized: true,
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