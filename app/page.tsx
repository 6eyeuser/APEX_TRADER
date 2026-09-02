"use client";

import React, { useRef, useEffect, useState } from "react";
import Cookies from "js-cookie";
import Nav from "@/components/landing/Nav";
import TickerTape from "@/components/landing/TickerTape";
import Hero from "@/components/landing/Hero";
import FeatureGrid from "@/components/landing/FeatureGrid";
import SecurityStrip from "@/components/landing/SecurityStrip";
import ClosingCta from "@/components/landing/ClosingCta";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if the user has a token when the page loads
    const token = Cookies.get("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans overflow-x-hidden">
      <Nav />
      <TickerTape />
      
      <div className="flex-1">
        {/* Pass isLoggedIn state to Hero so you can change the button there */}
        <Hero previewRef={previewRef} isLoggedIn={isLoggedIn} />
        <FeatureGrid />
        <SecurityStrip />
        <ClosingCta />
      </div>

      <Footer />
    </main>
  );
}