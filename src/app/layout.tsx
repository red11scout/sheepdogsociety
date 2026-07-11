import type { Metadata } from "next";
import {
  Inter,
  Merriweather,
  Fraunces,
  Cormorant_Garamond,
  JetBrains_Mono,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

// Display face — Fraunces variable, back as the broadsheet display serif
// (2026-07-08 masthead redesign; supersedes the Apr 2026 Barlow swap).
// The opsz/SOFT/WONK axes carry the editorial voice; axis values are set
// per-class in globals.css (.display-xl, .display-soft, .brand-wordmark,
// .dropcap), never per-component. Weight is the full variable range.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const SITE_NAME = "Sheepdog Society";
const SITE_DESCRIPTION =
  "A brotherhood of Christian men, anchored in Acts 20:28. We meet weekly around Scripture, tell each other the truth, and stand watch over one another.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com"
  ),
  title: "Sheepdog Society — Acts 20:28",
  description: SITE_DESCRIPTION,
  // Site-wide social-share defaults. Pages that set their own openGraph
  // (home, acts-20-28, letters) override these; everything else now shares
  // as a branded card instead of a bare link.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Sheepdog Society — Acts 20:28",
    description: SITE_DESCRIPTION,
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sheepdog Society — Acts 20:28",
    description: SITE_DESCRIPTION,
    images: ["/api/og/verse"],
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${merriweather.variable} ${fraunces.variable} ${cormorant.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
