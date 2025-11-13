import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

export const metadata = {
  title: 'ProvX - The Future of Disintermediation',
  description: 'MrProve replaces middlemen with mathematical proofs. Every transaction burns tokens. Every use creates scarcity. Trustless, private, instant settlement powered by PrivateProver technology.',
  metadataBase: new URL('https://provex.com'),
  openGraph: {
    title: 'ProvX - The Future of Disintermediation',
    description: 'MrProve replaces middlemen with mathematical proofs. Deflationary by design.',
    url: 'https://provex.com',
    siteName: 'ProvX',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'ProvX - MrProve Token',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProvX - The Future of Disintermediation',
    description: 'MrProve: Trustless proofs replacing middlemen. Deflationary by design.',
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
    title: 'ProvX',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <FontLoader weight="regular" priority={true} />
        <FontLoader weight="bold" />
      </head>
      <body className="bg-black text-white">
        <div className="relative">
          <AnimatedBackground />
          <div className="flex flex-col min-h-screen relative z-10">
            <NavBar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
