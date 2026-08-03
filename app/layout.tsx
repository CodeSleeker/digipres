import type { Metadata } from "next";
import { Bebas_Neue, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Fonts ported from the mockup's Google Fonts link:
 * Bebas Neue (headings), Playfair Display (display/italic), Inter (body).
 * Each is exposed as a CSS variable consumed by the @theme tokens in globals.css.
 */
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Presence Platform",
  description: "Websites for local businesses.",
  /**
   * The Aliamz Digital mark, for the platform's own surfaces (marketing, auth,
   * /admin, /platform).
   *
   * Declared as CONFIG, deliberately, rather than as `app/icon.svg`. A metadata
   * FILE in the app root applies to every route and outranks anything a deeper
   * segment declares — which would stamp the agency's icon on every client's
   * public site with no way to override it. As config it is merely the default,
   * and app/s/[slug] replaces it with the tenant's own (lib/tenant/icons.ts).
   */
  /*
   * The AD mark alone — no wordmark, no strapline. At the 16px a tab actually
   * renders, anything more is an unreadable smudge.
   *
   * PNG rather than SVG: the mark is a gradient render, so a vector version
   * would be a trace of the artwork rather than the artwork.
   */
  icons: {
    icon: [
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${playfairDisplay.variable} ${inter.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
