"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Send, CheckCircle2, Copy, Check, 
  ShieldCheck, BellRing, Zap, ExternalLink, RefreshCw 
} from "lucide-react";

export default function TelegramPage() {
  const router = useRouter();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const fetchTelegramStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const res = await fetch("/api/auth/user/me", { 
        credentials: "include",
        cache: "no-store" 
      });
      const data = await res.json();
      
      const username = data.user?.telegramUsername || data.telegramUsername;
      if (data.success && username) {
        setTelegramUsername(username);
      } else {
        setTelegramUsername(null);
      }
    } catch (err) {
      console.error("Failed to check status:", err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const generateCode = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/telegram/link/generate-code", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (data.code) {
        setLinkCode(data.code);
      } else if (data.error) {
        console.error("Auth Error:", data.error);
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to generate code:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // PRODUCTION FIX: Removed the legacy 'Cookies.get("token")' check 
  // that was causing the redirect loop.
  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const copyToClipboard = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(`/link ${linkCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#2962FF]/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="h-16 border-b border-[#1E222D] bg-[#131722]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")} 
            className="text-[#7C8699] hover:text-white transition flex items-center gap-2 bg-[#1E222D] hover:bg-[#2A2E39] px-3 py-1.5 rounded-lg text-sm"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <div className="w-px h-6 bg-[#1E222D]" />
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Send size={18} className="text-[#2962FF]" />
            Telegram Integration
          </h1>
        </div>

        <button 
          onClick={fetchTelegramStatus} 
          disabled={isCheckingStatus}
          className="flex items-center gap-2 text-[#7C8699] hover:text-white transition bg-[#1E222D] px-3 py-1.5 rounded-lg text-xs"
        >
          <RefreshCw size={13} className={isCheckingStatus ? "animate-spin text-[#2962FF]" : ""} />
          <span>Refresh Status</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-center relative z-10">
        <div className="w-full bg-[#131722] border border-[#1E222D] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E222D]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2962FF]/10 border border-[#2962FF]/30 flex items-center justify-center text-[#2962FF] shadow-inner">
                <Send size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ApexTrader Bot Link</h2>
                <p className="text-sm text-[#7C8699]">Real-time Telegram trade execution & portfolio alerts</p>
              </div>
            </div>

            <div>
              {telegramUsername && (
                <div className="flex items-center gap-2 bg-[#00C853]/10 border border-[#00C853]/30 px-3.5 py-1.5 rounded-xl text-[#00C853] text-xs font-semibold">
                  <CheckCircle2 size={15} />
                  <span>Linked: @{telegramUsername}</span>
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <Zap size={18} className="text-[#2962FF]" />
              <h3 className="text-sm font-semibold text-white">Instant Execution</h3>
              <p className="text-xs text-[#7C8699]">Send chat prompts like "/buy 2 TSLA" to execute trades instantly.</p>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <BellRing size={18} className="text-[#00C853]" />
              <h3 className="text-sm font-semibold text-white">Price & Drawdown Alerts</h3>
              <p className="text-xs text-[#7C8699]">Receive immediate automated notices when high-water mark triggers.</p>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <ShieldCheck size={18} className="text-[#FF9500]" />
              <h3 className="text-sm font-semibold text-white">Encrypted Handshake</h3>
              <p className="text-xs text-[#7C8699]">One-time token authorization directly paired to your session.</p>
            </div>
          </div>

          {/* Action Box */}
          <div className="bg-[#0B0E14] border border-[#1E222D] rounded-xl p-6 flex flex-col items-center text-center gap-4">
            {!linkCode ? (
              <>
                <p className="text-sm text-[#7C8699] max-w-md">
                  Click below to generate a secure one-time pairing key to link your Telegram handle.
                </p>
                <button
                  onClick={generateCode}
                  disabled={isLoading}
                  className="bg-[#2962FF] hover:bg-[#4477FF] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition shadow-[0_0_20px_rgba(41,98,255,0.4)] disabled:opacity-50"
                >
                  {isLoading ? "Generating Link Code..." : "Generate One-Time Link Code"}
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <p className="text-xs text-[#7C8699] uppercase tracking-wider font-semibold">
                  Step 1: Copy this pairing command
                </p>
                
                <div className="flex items-center gap-2 bg-[#131722] border border-[#2A2E39] px-4 py-3 rounded-xl max-w-md w-full justify-between font-mono">
                  <span className="text-[#00C853] text-sm font-bold">/link {linkCode}</span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs text-[#7C8699] hover:text-white bg-[#1E222D] px-2.5 py-1.5 rounded-lg transition"
                  >
                    {copied ? <Check size={14} className="text-[#00C853]" /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <p className="text-xs text-[#7C8699] uppercase tracking-wider font-semibold mt-2">
                  Step 2: Send command to the bot
                </p>

                <a
                  href="https://t.me/ApexTrader_Trading_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0088cc] hover:bg-[#0099e6] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition shadow-[0_0_20px_rgba(0,136,204,0.4)]"
                >
                  <Send size={16} />
                  <span>Open @ApexTrader_Trading_bot</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}