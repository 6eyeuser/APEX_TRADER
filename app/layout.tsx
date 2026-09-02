import type { Metadata } from "next";
// @ts-ignore
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ApexTrader - Institutional Grade Tools",
  description: "Experience lightning-fast execution, advanced charting, and real-time market data in one unified terminal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Set the default dark background to match your login UI */}
      <body className="bg-[#0B0E14] text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}