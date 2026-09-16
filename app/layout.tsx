import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

export function generateMetadata(): Metadata {
  const configuredOrigin = process.env.EASAP_PUBLIC_URL || "http://localhost:3000";
  const origin = new URL(configuredOrigin).origin;
  const title = "EASAP | Evidence Before Agent Authority";
  const description =
    "Stress-test the complete AI agent system, reproduce failures, and turn signed evidence into a defensible release decision.";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "EASAP",
    icons: {
      icon: [
        { url: "/favicon.ico?v=easap-1", sizes: "16x16 32x32 48x48 256x256" },
        { url: "/favicon-32.png?v=easap-1", type: "image/png", sizes: "32x32" },
        { url: "/favicon.svg?v=easap-1", type: "image/svg+xml", sizes: "any" },
      ],
      shortcut: "/favicon.ico?v=easap-1",
      apple: { url: "/apple-touch-icon.png?v=easap-1", sizes: "180x180", type: "image/png" },
    },
    openGraph: {
      type: "website",
      url: origin,
      title,
      description,
      siteName: "EASAP",
      images: [{ url: `${origin}/og.png`, width: 1734, height: 907, alt: "EASAP evidence-led release assurance for consequential agents" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}
