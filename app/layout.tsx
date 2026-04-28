import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cairo } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth-context'
import { DataProvider } from '@/lib/data-context'
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

export const metadata: Metadata = {
  title: 'Storify - Multi-Store Order Management',
  description: 'SaaS platform for managing multiple online stores, orders, and customers',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
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
      <body className={`${geist.variable} ${geistMono.variable} ${cairo.variable} font-sans antialiased`}>
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </CartProvider>
          </DataProvider>
        </AuthProvider>

      </body>
    </html>
  )
}
