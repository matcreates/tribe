import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tribe",
  description: "Minimalist email-list management for creators. Build your community, send beautiful emails, and grow your tribe.",
  metadataBase: new URL("https://madewithtribe.com"),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Tribe",
    description: "The newsletter tool made for creators.",
    url: "https://madewithtribe.com",
    siteName: "Tribe",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 628,
        alt: "Tribe - The newsletter tool made for creators",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tribe",
    description: "The newsletter tool made for creators.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: 'rgb(252, 250, 247)' }}>
      <head>
        <meta name="theme-color" content="rgb(252, 250, 247)" />
      </head>
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased`} style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', backgroundColor: 'rgb(252, 250, 247)' }}>
        <SessionProvider>
        {children}
        </SessionProvider>
      </body>
    </html>
  );
}
