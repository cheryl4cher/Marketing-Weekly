/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.digitaling.com' },
      { protocol: 'https', hostname: '**.digitaling.cn' },
      { protocol: 'https', hostname: 'image.digitaling.com' },
      { protocol: 'https', hostname: 'images.digitaling.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
