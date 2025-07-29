import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Engelbert Huber - Orquestador de Agentes Digitales",
  description: "No soy programador. No soy marketero. Soy un orquestador de agentes digitales que diseña sistemas invisibles para que puedas volver a ser creativo, humano, libre.",
  keywords: ["IA", "automatización", "sistemas", "agentes digitales", "flujos humanos"],
  authors: [{ name: "Engelbert Huber Quequejana" }],
  openGraph: {
    title: "Engelbert Huber - Orquestador de Agentes Digitales",
    description: "Diseño sistemas invisibles que respetan lo humano",
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
