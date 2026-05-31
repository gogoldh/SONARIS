import type { Metadata } from "next";
import { Anek_Tamil, Anton, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const anekTamil = Anek_Tamil({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Sonaris",
  description: "Decision-support for hearing-loss triage from audiogram scans.",
  icons: {
    icon: "/media/favicon2.svg",
    apple: "/media/favicon2.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anekTamil.variable} ${barlowCondensed.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
