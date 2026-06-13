import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cairo, Outfit } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth-context'
import { DataProvider } from '@/lib/data-context'
import { I18nProvider } from '@/components/i18n-provider'
import './globals.css'

const geist = Geist({
  subsets: ["latin"],
  variable: '--font-geist',
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-geist-mono',
})
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: '--font-cairo',
})
const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
})

import { getSiteSettings } from '@/lib/api-client'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings.site_name || 'Storify'
  const siteLogo = settings.site_logo || '/favicon.png'

  return {
    title: {
      default: `${siteName} - Multi-Store Order Management`,
      template: `%s | ${siteName}`
    },
    description: 'SaaS platform for managing multiple online stores, orders, and customers',
    manifest: '/manifest.json',
    icons: {
      icon: siteLogo,
      apple: siteLogo,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

import { CartProvider } from '@/lib/cart-context'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${cairo.variable} ${outfit.variable} font-sans antialiased`}>
        <AuthProvider>
          <I18nProvider>
            <DataProvider>
              <CartProvider>
                {children}
                <Toaster position="bottom-right" richColors closeButton />
              </CartProvider>
            </DataProvider>
          </I18nProvider>
        </AuthProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
