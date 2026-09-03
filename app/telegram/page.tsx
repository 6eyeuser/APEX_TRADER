"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Send, CheckCircle2, 
  ShieldCheck, BellRing, Zap, ExternalLink, RefreshCw, Loader2 
} from "lucide-react";

export default function TelegramPage() {
  const router = useRouter();
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const connectTelegram = async () => {
    try {
      setIsLoading(true);
      // 1. Generate one-time code behind the scenes
      const res = await fetch("/api/auth/telegram/link/generate-code", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      
      if (data.code) {
        // 2. Open Telegram directly with the code in the start parameter (Zero manual input!)
        window.open(`https://t.me/ApexTrader_Trading_bot?start=${data.code}`, "_blank");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col font-sans relative overflow-hidden">
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
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E222D]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2962FF]/10 border border-[#2962FF]/30 flex items-center justify-center text-[#2962FF] shadow-inner">
                <Send size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ApexTrader Bot Link</h2>
                <p className="text-sm text-[#7C8699]">Instant Telegram execution & hands-free trading</p>
              </div>
            </div>

            <div>
              {telegramUsername ? (
                <div className="flex items-center gap-2 bg-[#00C853]/10 border border-[#00C853]/30 px-3.5 py-1.5 rounded-xl text-[#00C853] text-xs font-semibold">
                  <CheckCircle2 size={15} />
                  <span>Linked: @{telegramUsername}</span>
                </div>
              ) : (
                <div className="text-xs bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500] px-3 py-1 rounded-xl">
                  Not Connected
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <Zap size={18} className="text-[#2962FF]" />
              <h3 className="text-sm font-semibold text-white">Instant Execution</h3>
              <p className="text-xs text-[#7C8699]">Execute trades by text command or interactive buttons.</p>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <BellRing size={18} className="text-[#00C853]" />
              <h3 className="text-sm font-semibold text-white">Portfolio Sync</h3>
              <p className="text-xs text-[#7C8699]">Live balance and equity mirrored between web and chat.</p>
            </div>
            <div className="bg-[#0B0E14] border border-[#1E222D] p-4 rounded-xl flex flex-col gap-2">
              <ShieldCheck size={18} className="text-[#FF9500]" />
              <h3 className="text-sm font-semibold text-white">Voice Trading</h3>
              <p className="text-xs text-[#7C8699]">Hold the Telegram mic button to execute trades verbally.</p>
            </div>
          </div>

          {/* 1-Click Action */}
          <div className="bg-[#0B0E14] border border-[#1E222D] rounded-xl p-8 flex flex-col items-center text-center gap-4">
            <h3 className="text-base font-semibold text-white">
              {telegramUsername ? "Re-connect or Switch Account" : "Connect Your Telegram Account"}
            </h3>
            <p className="text-sm text-[#7C8699] max-w-md">
              Tap the button below. Telegram will open automatically—just press <b>START</b> to link your portfolio instantly.
            </p>

            <button
              onClick={connectTelegram}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-[#0088cc] hover:bg-[#0099e6] text-white px-8 py-3 rounded-xl font-medium text-sm transition shadow-[0_0_25px_rgba(0,136,204,0.4)] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{telegramUsername ? "Reconnect in Telegram" : "Connect with Telegram"}</span>
                  <ExternalLink size={14} />
                </>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}