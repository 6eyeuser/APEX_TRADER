"use client";

import React, { useRef } from "react";
import { useSession } from "next-auth/react";
import Nav from "@/components/landing/Nav";
import TickerTape from "@/components/landing/TickerTape";
import Hero from "@/components/landing/Hero";
import FeatureGrid from "@/components/landing/FeatureGrid";
import SecurityStrip from "@/components/landing/SecurityStrip";
import ClosingCta from "@/components/landing/ClosingCta";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Connect directly to NextAuth session state
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans overflow-x-hidden">
      <Nav />
      <TickerTape />
      
      <div className="flex-1">
        <Hero previewRef={previewRef} isLoggedIn={isLoggedIn} />
        <FeatureGrid />
        <SecurityStrip />
        <ClosingCta />
      </div>

      <Footer />
    </main>
  );
}