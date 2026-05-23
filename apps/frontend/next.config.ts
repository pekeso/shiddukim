import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_URL ??
      'http://172.105.156.186:4000/api/v1',
  },
};

export default nextConfig;
