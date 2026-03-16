/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-neon',
    '@prisma/adapter-pg',
  ],
}

export default nextConfig
