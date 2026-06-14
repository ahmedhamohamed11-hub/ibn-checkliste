import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/hooks/useUser'
import { ThemeProvider } from '@/hooks/useTheme'

export const metadata: Metadata = {
  title: 'Inbetriebnahme-Checkliste',
  description: 'Professionelle Checklisten-App für Kälte-, Klima- und Wärmepumpentechnik',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IBN-Check',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0f1e" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
