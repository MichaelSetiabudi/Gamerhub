import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Gamer\'s Hub - Real-Time Chat for Gaming Communities',
  description: 'A Discord-inspired real-time chat platform dedicated specifically for gaming communities. Connect, chat, and game together!',
  keywords: 'gaming, chat, real-time, discord, valorant, genshin impact, minecraft, community',
  authors: [{ name: 'MichaelSetiabudi' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  openGraph: {
    title: 'Gamer\'s Hub',
    description: 'Real-Time Chat Platform for Gaming Communities',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gamer\'s Hub',
    description: 'Real-Time Chat Platform for Gaming Communities',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'dark:bg-dark-800 dark:text-white',
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
