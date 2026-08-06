import type { Metadata } from "next";
import { Bebas_Neue, Inter, Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Fonts ported from the mockups' Google Fonts links.
 *
 * Barber / luxury:    Bebas Neue (headings), Playfair Display, Inter (body).
 * Patisserie / boutique: Playfair Display (headings), Manrope (body).
 *
 * Loaded here rather than per template because next/font must run at the module
 * top level of a server file; a template can't self-host its own. Playfair is
 * shared by both, so the cost of the second template is Manrope alone — and a
 * face nobody's page references is never requested by the browser.
 *
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

const manrope = Manrope({
  variable: "--font-manrope",
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
      className={`${bebasNeue.variable} ${playfairDisplay.variable} ${inter.variable} ${manrope.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
