import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Engelbert Huber - AI Engineering",
  description: "AI Engineering - Diseñando sistemas inteligentes que transforman la manera de trabajar.",
  keywords: ["AI Engineering", "IA", "automatización", "sistemas", "inteligencia artificial", "machine learning"],
  authors: [{ name: "Engelbert Huber Quequejana" }],
  openGraph: {
    title: "Engelbert Huber - AI Engineering",
    description: "AI Engineering - Sistemas inteligentes que transforman el trabajo",
    type: "website",
    locale: "es_ES",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${inter.className} antialiased bg-white text-gray-900 overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
