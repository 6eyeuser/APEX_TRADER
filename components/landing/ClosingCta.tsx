// components/landing/ClosingCta.tsx
"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ClosingCta() {
  return (
    <section className="border-t border-[#1E222D] bg-[#0B0E14] py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00C853] rounded-full mix-blend-screen filter blur-[200px] opacity-10 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6 text-white">
          Ready to elevate your trading?
        </h2>
        <p className="text-[#7C8699] text-lg mb-10 max-w-2xl mx-auto">
          Join thousands of traders using ApexTrader for lightning-fast execution and institutional-grade analytics.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-[#00C853] hover:bg-[#00E676] text-[#052012] px-8 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(0,200,83,0.2)] hover:shadow-[0_0_30px_rgba(0,200,83,0.4)]"
          >
            Create Free Account
            <ArrowUpRight size={18} />
          </Link>
          <Link
            href="/terminal"
            className="flex items-center gap-2 bg-[#131722] hover:bg-[#1E222D] text-white border border-[#1E222D] px-8 py-4 rounded-xl font-bold transition-all"
          >
            Launch Demo Terminal
          </Link>
        </div>
      </div>
    </section>
  );
}