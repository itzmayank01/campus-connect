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
    // Prisma
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-neon',
    '@prisma/adapter-pg',
    // StudyLab AI pipeline packages — must NOT be bundled by webpack
    'pdf-parse',
    'mammoth',
    'groq-sdk',
    'msedge-tts',
    'fluent-ffmpeg',
    'bullmq',
    'ioredis',
    'file-type',
  ],
}

export default nextConfig
