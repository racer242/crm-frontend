import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import "primereact/resources/themes/lara-light-purple/theme.css";
// import "primereact/resources/themes/lara-dark-purple/theme.css";
// import "primereact/resources/themes/viva-dark/theme.css";

import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
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
  title: "CRM Platform",
  description: "Metadata-Driven CRM Platform",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <GlobalPreloader />
        <PrimeReactProvider value={primeReactConfig}>
          {children}
        </PrimeReactProvider>
      </body>
    </html>
  );
}
