import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { BRAND_DESCRIPTION, BRAND_TITLE } from "@/lib/brand";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND_TITLE,
  description: BRAND_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-dvh min-h-0 antialiased ${inter.variable}`}>
      <body className="flex h-dvh min-h-0 flex-col bg-bg font-sans text-text">{children}</body>
    </html>
  );
}
