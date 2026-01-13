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
  description: "Minimalist email-list management",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "32x32" },
    ],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased`} style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
        <SessionProvider>
        {children}
        </SessionProvider>
      </body>
    </html>
  );
}
