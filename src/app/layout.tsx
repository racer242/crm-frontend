import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { PrimeReactProvider } from "primereact/api";
import { GlobalPreloader } from "@/components/GlobalPreloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  other: {
    // Preload PrimeReact CSS to prevent FOUC
    "link:rel": "preload",
    "link:as": "style",
  },
};

const primeReactConfig = {
  ripple: true,
  unstyled: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        {/* Отключает bfcache — при возврате назад страница перезагружается */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('pageshow', function(e) {
                if (e.persisted) {
                  window.location.reload();
                }
              });
            `,
          }}
        />
        <GlobalPreloader />
        <PrimeReactProvider value={primeReactConfig}>
          {children}
        </PrimeReactProvider>
      </body>
    </html>
  );
}
