/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/bleep-that-shit' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/bleep-that-shit' : '',
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    // Handle WASM files and workers
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true
    };
    
    return config;
  }
};

export default nextConfig;