/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  // Augmenter le timeout des requêtes et la taille des données
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    largePageDataBytes: 10 * 1024 * 1024, // 10MB pour les réponses
  }
}

module.exports = nextConfig 