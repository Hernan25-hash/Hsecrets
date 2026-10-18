import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import AuthWrapper from "@/components/auth/AuthWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "XSecrets — Discover Your Secret Side",
  description: "A private, immersive space for curated adult entertainment.",
  generator: "v0.app",

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthWrapper>{children}</AuthWrapper>

        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
