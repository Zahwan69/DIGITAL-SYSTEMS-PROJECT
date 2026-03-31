import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyAI — AI Past Paper Assistant",
  description: "Practice smarter with AI-generated feedback from past papers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col">{children}</body>
    </html>
  );
}
