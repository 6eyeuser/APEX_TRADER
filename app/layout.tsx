// app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
// @ts-ignore
import "./globals.css";

// 1. Import the Web3Provider
import { Web3Provider } from "@/components/Web3Provider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "ApexTrader — Institutional-grade demo trading terminal",
  description:
    "Trade stocks, forex, and crypto on a web terminal built with institutional-terminal execution mechanics. Simulated funds, real mechanics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">
        {/* 2. Wrap the children inside the Web3Provider */}
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}