import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-email/components', '@react-email/render'],
  allowedDevOrigins: ['*.lvh.me', 'lvh.me'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
      },
    ],
  },
};

export default nextConfig;
