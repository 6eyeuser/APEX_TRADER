
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, ArrowRight, Loader2, Activity, ShieldCheck, Zap, Globe, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";

export default function SignupPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code");
      
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp }), 
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign up");

      router.push("/terminal");
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0B0E14] text-white font-sans overflow-hidden">
      
      {}
      <div className="hidden lg:flex flex-col relative w-1/2 bg-[#0d1117] border-r border-[#1E222D] p-12 justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00C853]/10 via-[#0B0E14]/50 to-[#0B0E14] z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00C853] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse" />

        <div className="relative z-10 max-w-lg">
          <Magnetic pull={0.1}>
            <div className="flex items-center gap-3 mb-6">
              <Activity size={36} className="text-[#00C853]" />
              <h1 className="text-3xl font-bold tracking-tight">ApexTrader</h1>
            </div>
          </Magnetic>
          
          <h2 className="text-4xl font-semibold mb-10 leading-tight">Join the next generation of traders.</h2>
          
          <div className="space-y-8">
            <Magnetic pull={0.05}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center shrink-0">
                  <Zap size={20} className="text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Lightning Execution</h3>
                  <p className="text-[#7C8699] text-sm">Direct market access with ultra-low latency routing.</p>
                </div>
              </div>
            </Magnetic>
            <Magnetic pull={0.05}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center shrink-0">
                  <Globe size={20} className="text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Global Markets</h3>
                  <p className="text-[#7C8699] text-sm">Trade equities and crypto from a single unified terminal.</p>
                </div>
              </div>
            </Magnetic>
            <Magnetic pull={0.05}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Bank-grade Security</h3>
                  <p className="text-[#7C8699] text-sm">Your assets and data are protected by enterprise encryption.</p>
                </div>
              </div>
            </Magnetic>
          </div>
        </div>
      </div>

      {}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md relative">
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <Activity size={28} className="text-[#00C853]" />
            <h1 className="text-2xl font-bold tracking-tight">ApexTrader</h1>
          </div>
          
          <AnimatePresence mode="wait">
            {step === "details" ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold mb-2">Create an account</h2>
                <p className="text-[#7C8699] text-sm mb-8">Join the platform and start trading today.</p>

                {error && <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/50 text-[#FF3B30] text-sm p-3 rounded-lg mb-4">{error}</div>}

                {}
                <div className="mb-6">
                  <button type="button" onClick={() => signIn('google', { callbackUrl: '/terminal' })} className="w-full flex items-center justify-center gap-3 bg-[#131722] hover:bg-[#1E222D] border border-[#1E222D] rounded-xl py-3 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="text-sm font-medium">Continue with Google</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-full border-t border-[#1E222D]"></div>
                  <div className="relative bg-[#0B0E14] px-4 text-xs text-[#7C8699] uppercase tracking-wider">Or continue with email</div>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#7C8699] uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8699] group-focus-within:text-[#00C853] transition-colors" />
                      <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#131722] border border-[#1E222D] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#00C853] transition-colors shadow-sm" placeholder="John Doe" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#7C8699] uppercase tracking-wider mb-1.5">Email</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8699] group-focus-within:text-[#00C853] transition-colors" />
                      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#131722] border border-[#1E222D] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#00C853] transition-colors shadow-sm" placeholder="name@example.com" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-[#7C8699] uppercase tracking-wider mb-1.5">Password</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8699] group-focus-within:text-[#00C853] transition-colors" />
                      <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#131722] border border-[#1E222D] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#00C853] transition-colors shadow-sm" placeholder="••••••••" />
                    </div>
                  </div>

                  <Magnetic pull={0.15}>
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00E676] disabled:bg-[#00C853]/50 text-[#052012] font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,200,83,0.2)] hover:shadow-[0_0_30px_rgba(0,200,83,0.4)] mt-4">
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
                    </button>
                  </Magnetic>
                </form>

                <p className="text-sm text-[#7C8699] mt-8 text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#00C853] hover:underline font-medium">Log in</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button onClick={() => setStep("details")} className="text-[#7C8699] hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                <p className="text-[#7C8699] text-sm mb-8">We sent a 6-digit verification code to <strong className="text-white">{email}</strong>.</p>

                {error && <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/50 text-[#FF3B30] text-sm p-3 rounded-lg mb-4">{error}</div>}

                <form onSubmit={handleVerifyAndSignup} className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-[#7C8699] uppercase tracking-wider mb-1.5">Verification Code</label>
                    <div className="relative group">
                      <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8699] group-focus-within:text-[#00C853] transition-colors" />
                      <input 
                        required 
                        type="text" 
                        maxLength={6}
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full bg-[#131722] border border-[#1E222D] rounded-xl pl-11 pr-4 py-3 text-lg tracking-[0.5em] font-mono focus:outline-none focus:border-[#00C853] transition-colors shadow-sm" 
                        placeholder="000000" 
                      />
                    </div>
                  </div>

                  <Magnetic pull={0.15}>
                    <button type="submit" disabled={isLoading || otp.length < 6} className="w-full flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00E676] disabled:bg-[#00C853]/50 text-[#052012] font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,200,83,0.2)] hover:shadow-[0_0_30px_rgba(0,200,83,0.4)] mt-2">
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Verify & Complete <ArrowRight size={18} /></>}
                    </button>
                  </Magnetic>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}