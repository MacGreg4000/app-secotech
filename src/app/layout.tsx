import AuthProvider from '@/components/providers/AuthProvider'
import './globals.css'

export const metadata = {
  title: 'AppSecotech',
  description: 'Application de gestion de chantiers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
