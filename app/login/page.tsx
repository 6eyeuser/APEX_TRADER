"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Loader2,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      await signIn("google", {
        callbackUrl: "/terminal",
      });
    } catch (err: any) {
      console.error("Google login error:", err);

      setError(
        err?.message || "Failed to sign in with Google"
      );

      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B0E14] text-white font-sans overflow-hidden">

      {/* ========================================================= */}
      {/* LEFT SIDE */}
      {/* ========================================================= */}

      <div className="hidden lg:flex flex-col relative w-1/2 bg-[#0d1117] border-r border-[#1E222D] p-12 justify-center overflow-hidden">

        {/* Background glow */}

        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2962FF]/10 via-[#0B0E14]/50 to-[#0B0E14] z-0" />

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2962FF] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" />

        <div className="relative z-10 max-w-lg">

          {/* LOGO */}

          <Magnetic pull={0.1}>

            <div className="flex items-center gap-3 mb-6">

              <Activity
                size={36}
                className="text-[#2962FF]"
              />

              <h1 className="text-3xl font-bold tracking-tight">
                ApexTrader
              </h1>

            </div>

          </Magnetic>

          {/* HEADING */}

          <h2 className="text-4xl font-semibold mb-4 leading-tight">
            Institutional grade tools.
            <br />
            For the modern trader.
          </h2>

          <p className="text-[#7C8699] text-lg mb-12">
            Experience lightning-fast execution,
            advanced charting, and real-time market
            data in one unified terminal.
          </p>

          {/* ===================================================== */}
          {/* GRAPH EFFECT — KEPT FROM YOUR ORIGINAL */}
          {/* ===================================================== */}

          <div className="w-full h-48 relative bg-[#131722]/50 backdrop-blur-md rounded-2xl border border-[#1E222D] p-4 shadow-2xl">

            <svg
              viewBox="0 0 400 150"
              className="w-full h-full overflow-visible"
            >

              <defs>

                <linearGradient
                  id="chartGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#2962FF"
                    stopOpacity="0.4"
                  />

                  <stop
                    offset="100%"
                    stopColor="#2962FF"
                    stopOpacity="0"
                  />

                </linearGradient>

              </defs>

              {/* Animated line */}

              <motion.path
                d="M 0 100 Q 20 80, 50 90 T 100 60 T 150 70 T 200 30 T 250 50 T 300 20 T 350 40 T 400 10"
                fill="none"
                stroke="#2962FF"
                strokeWidth="3"
                initial={{
                  pathLength: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                }}
              />

              {/* Graph fill */}

              <motion.path
                d="M 0 100 Q 20 80, 50 90 T 100 60 T 150 70 T 200 30 T 250 50 T 300 20 T 350 40 T 400 10 L 400 150 L 0 150 Z"
                fill="url(#chartGradient)"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />

              {/* Animated endpoint */}

              <motion.circle
                cx="400"
                cy="10"
                r="4"
                fill="#fff"
                initial={{
                  scale: 0,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="shadow-[0_0_10px_#2962FF]"
              />

            </svg>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* RIGHT SIDE */}
      {/* ========================================================= */}

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">

        <div className="w-full max-w-md">

          {/* MOBILE LOGO */}

          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">

            <Activity
              size={28}
              className="text-[#2962FF]"
            />

            <h1 className="text-2xl font-bold tracking-tight">
              ApexTrader
            </h1>

          </div>

          {/* TITLE */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
            }}
          >

            <h2 className="text-2xl font-bold mb-2">
              Welcome back
            </h2>

            <p className="text-[#7C8699] text-sm mb-8">
              Sign in securely with your Google account.
            </p>

          </motion.div>

          {/* ERROR */}

          {error && (

            <motion.div
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="bg-[#FF3B30]/10 border border-[#FF3B30]/50 text-[#FF3B30] text-sm p-3 rounded-lg mb-4"
            >

              {error}

            </motion.div>

          )}

          {/* ===================================================== */}
          {/* GOOGLE LOGIN */}
          {/* ===================================================== */}

          <Magnetic pull={0.08}>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="
                group
                relative
                w-full
                flex
                items-center
                justify-center
                gap-3
                overflow-hidden
                rounded-xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                py-3.5
                text-white/90
                backdrop-blur-sm
                transition-all
                duration-300
                hover:border-white/[0.14]
                hover:bg-white/[0.05]
                hover:text-white
                hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]
                active:scale-[0.99]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >

              {/* Subtle shine */}

              <div
                className="
                  absolute
                  inset-0
                  -translate-x-full
                  bg-gradient-to-r
                  from-transparent
                  via-white/[0.04]
                  to-transparent
                  transition-transform
                  duration-700
                  group-hover:translate-x-full
                "
              />

              {/* Google icon */}

              {isLoading ? (

                <Loader2
                  size={19}
                  className="animate-spin relative z-10"
                />

              ) : (

                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 relative z-10 shrink-0"
                >

                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />

                </svg>

              )}

              <span className="text-sm font-medium relative z-10">

                {isLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}

              </span>

            </button>

          </Magnetic>

          {/* ===================================================== */}
          {/* SECURITY */}
          {/* ===================================================== */}

          <div className="mt-7 flex items-center justify-center gap-2 text-[#5F6878]">

            <span className="text-xs">
              Secure authentication powered by Google
            </span>

          </div>

          {/* ===================================================== */}
          {/* SIGNUP */}
          {/* ===================================================== */}

          <p className="text-sm text-[#7C8699] mt-8 text-center">

            Don't have an account?{" "}

            <Link
              href="/signup"
              className="text-[#2962FF] hover:underline font-medium"
            >
              Create one
            </Link>

          </p>

          {/* ===================================================== */}
          {/* TERMS */}
          {/* ===================================================== */}

          <p className="text-[11px] text-[#4F5868] text-center mt-8 leading-relaxed">

            By continuing, you agree to ApexTrader's{" "}

            <span className="text-[#687386]">
              Terms of Service
            </span>{" "}

            and{" "}

            <span className="text-[#687386]">
              Privacy Policy
            </span>
            .

          </p>

        </div>

      </div>

    </div>
  );
}