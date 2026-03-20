/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-neon',
    '@prisma/adapter-pg',
    'pdf-parse',
    'jszip'
  ],
}

export default nextConfig
