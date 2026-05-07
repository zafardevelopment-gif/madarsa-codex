/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false
  },
  webpack: (config) => {
    // Tesseract.js worker needs to be served as a static file
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false
    };
    return config;
  }
};

export default nextConfig;
