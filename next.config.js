/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Packages externes pour les composants serveur
  serverExternalPackages: ['pdf-lib'],
  // Augmenter le timeout des requêtes et la taille des données
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    largePageDataBytes: 10 * 1024 * 1024, // 10MB pour les réponses
  }
}

module.exports = nextConfig 