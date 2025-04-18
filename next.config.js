/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Next.js
  reactStrictMode: true,
  // Générer un build standalone qui inclut toutes les dépendances
  output: 'standalone',
  images: {
    domains: ['localhost'],
    // Configurations spécifiques pour les images statiques
    disableStaticImages: false,
  },
  // Packages externes pour les composants serveur
  serverExternalPackages: ['pdf-lib'],
  // Augmenter le timeout des requêtes et la taille des données
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    largePageDataBytes: 10 * 1024 * 1024, // 10MB pour les réponses
  },
  // Ignorer les erreurs de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignorer les erreurs ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration pour permettre l'importation d'images
  webpack(config) {
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // Ajouter des règles de réécriture pour servir correctement les fichiers statiques
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/documents/serve/:path*'
      }
    ];
  },
}

module.exports = nextConfig 