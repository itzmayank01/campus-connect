/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
    // StudyLab AI pipeline — must NOT be bundled by webpack
    // NOTE: pdf-parse is intentionally removed — it causes Vercel crashes.
    //       We use pdfjs-dist/legacy instead (pure JS, no fs side-effects).
    'pdfjs-dist',
    'mammoth',
    'groq-sdk',
    'msedge-tts',
    'fluent-ffmpeg',
    'bullmq',
    'ioredis',
    'file-type',
    'jszip',
  ],
}

export default nextConfig
