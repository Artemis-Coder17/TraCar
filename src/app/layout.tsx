import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SWRegister } from "./sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tracar.app'),
  title: {
    default: 'TraCar',
    template: '%s | TraCar',
  },
  description: 'Keep your car in check — track NCT, insurance, motor tax, service history and fuel all in one place.',
  keywords: ['car tracker', 'NCT reminder', 'motor tax', 'car insurance', 'vehicle maintenance', 'fuel tracker', 'Ireland'],
  authors: [{ name: 'Artemis Coder', url: 'https://github.com/Artemis-Coder17' }],
  openGraph: {
    title: 'TraCar',
    description: 'Keep your car in check — track NCT, insurance, motor tax, service history and fuel all in one place.',
    url: 'https://tracar.app',
    siteName: 'TraCar',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TraCar — Vehicle Maintenance Tracker',
      },
    ],
    locale: 'en_IE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TraCar',
    description: 'Keep your car in check — track NCT, insurance, motor tax, service history and fuel all in one place.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TraCar',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050c18",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Animated ambient gradient backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
            background: 'linear-gradient(135deg, #040a14, #060d1c)',
          }}
        >
          <div className="ambient-blob ambient-blob-cyan" />
          <div className="ambient-blob ambient-blob-emerald" />
          <div className="ambient-blob ambient-blob-indigo" />
        </div>

        {/* Main content above backdrop */}
        <SWRegister />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <filter id="liquid-refract">
                <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="noise"/>
                <feGaussianBlur in="noise" stdDeviation="2" result="softNoise"/>
                <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="10" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            </defs>
          </svg>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(8,14,26,0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500,
              },
            }}
          />
        </div>
      </body>
    </html>
  );
}
