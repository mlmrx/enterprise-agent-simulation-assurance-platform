import type { Metadata } from "next";
import "./globals.css";

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
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
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
      <body>{children}</body>
    </html>
  );
}
