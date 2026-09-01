// components/landing/Hero.tsx
"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { RefObject } from "react";
import Link from "next/link";
import LiveTerminalPreview from "./LiveTerminalPreview";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

// 1. Add isLoggedIn to the interface
interface HeroProps {
  previewRef: RefObject<HTMLDivElement>;
  isLoggedIn?: boolean;
}

export default function Hero({ previewRef, isLoggedIn }: HeroProps) {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-14 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <motion.div
          custom={0}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest rounded-full border border-panel px-3 py-1 mb-6 text-muted"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bull" />
          Demo terminal · Simulated funds
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="font-display text-4xl sm:text-5xl leading-[1.08] tracking-tight mb-5"
        >
          Institutional-grade trading, powered by web-native speed.
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-base sm:text-lg mb-8 max-w-md text-muted"
        >
          Trade stocks, forex, and crypto on a web terminal built with institutional-terminal
          execution mechanics, real-time leverage calculators, and simulated wallet funding.
        </motion.p>

        <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp} className="flex flex-wrap items-center gap-3">
          {/* 2. Swap the button based on login status */}
          {isLoggedIn ? (
            <Link
              href="/terminal"
              className="rounded-lg px-6 py-3.5 text-sm font-bold bg-[#00C853] text-[#052012] transition-all hover:bg-[#00E676] shadow-[0_0_15px_rgba(0,200,83,0.2)] hover:shadow-[0_0_25px_rgba(0,200,83,0.4)] flex items-center gap-1.5"
            >
              Go to Terminal
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <Link
              href="/signup"
              className="rounded-lg px-6 py-3.5 text-sm font-bold bg-[#00C853] text-[#052012] transition-all hover:bg-[#00E676] shadow-[0_0_15px_rgba(0,200,83,0.2)] hover:shadow-[0_0_25px_rgba(0,200,83,0.4)] flex items-center gap-1.5"
            >
              Create Free Account
              <ArrowUpRight size={16} />
            </Link>
          )}
        </motion.div>

        {/* 3. Conditionally render the subtext */}
        <p className="text-[11px] mt-4 text-muted">
          {isLoggedIn 
            ? "Welcome back to ApexTrader." 
            : "No card required · 100,000.00 simulated USD on signup"}
        </p>
      </div>

      <div ref={previewRef}>
        <LiveTerminalPreview />
      </div>
    </section>
  );
}