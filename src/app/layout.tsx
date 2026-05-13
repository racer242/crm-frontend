import type { Metadata } from "next";
import "./globals.css";

import { PrimeReactProvider } from "primereact/api";
import { GlobalPreloader } from "@/components/GlobalPreloader";

const useSystemFonts = process.env.NEXT_PUBLIC_USE_SYSTEM_FONTS === "true";

const fontVariables = useSystemFonts ? "" : getGoogleFontVariables();

function getGoogleFontVariables(): string {
  // Google Fonts may not be reachable in all environments.
  // Set NEXT_PUBLIC_USE_SYSTEM_FONTS=true in .env to skip Google Fonts.
  // Lazy-require to defer the fetch until build time if fonts are available.
  try {
    const { Geist, Geist_Mono } =
      require("next/font/google") as typeof import("next/font/google");
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
    return `${geistSans.variable} ${geistMono.variable}`;
  } catch {
    console.warn("Google Fonts unavailable, falling back to system fonts.");
    return "";
  }
}

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
      className={fontVariables || undefined}
      data-scroll-behavior="smooth"
    >
      <body>
        {/* Отключает bfcache — при возврате назад страница перезагружается */}
        <div
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{
            __html: `<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onload="performance.getEntriesByType('navigation')[0]?.type=='back_forward'&&location.reload()">`,
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
