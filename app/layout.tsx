import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { Providers } from '@/components/Providers'
import AppKitProvider from '@/context/AppKitProvider'
import { Toaster } from '@/components/ui/toaster'
import AnimatedBackgroundWrapper from '@/components/AnimatedBackgroundWrapper'
import { headers } from 'next/headers'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

export const metadata = {
  title: 'LookIntoMaxi Dapp',
  description: 'Don\'t fade liquid hex stakes bro - End stakes & redeem your HEX principle and yield. Manage your perpetual pool stakes with ease.',
  metadataBase: new URL('https://stake.lookintomaxi.com'),
  openGraph: {
    title: 'LookIntoMaxi Dapp',
    description: 'Claim your HEX here.',
    url: 'https://stake.lookintomaxi.com',
    siteName: 'LookIntoMaxi Dapp',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'LookIntoMaxi Dapp',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LookIntoMaxi Dapp',
    description: 'The home of perpetual pool stake redemption',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    apple: [
      {
        url: '/favicon-apple.png',
        type: 'image/png',
        sizes: '180x180',
      }
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'LookIntoMaxi Dapp',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en" className="font-sans">
      <head>
        <FontLoader weight="regular" priority={true} />
        <FontLoader weight="bold" />
        <script defer data-domain="otc.lookintomaxi.com" src="https://plausible.io/js/script.js"></script>
      </head>
      <body className="min-h-screen bg-black text-white">
        <AppKitProvider cookies={cookies}>
          <Providers>
            <AnimatedBackgroundWrapper />
            <div className="flex flex-col min-h-screen relative z-10">
              <NavBar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </Providers>
        </AppKitProvider>
      </body>
    </html>
  )
}
