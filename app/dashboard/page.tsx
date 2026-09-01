"use client";
import React, { useMemo, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { 
  ArrowLeft, Wallet, Briefcase, History, 
  TrendingUp, Activity, RefreshCw, Award, Clock,
  ChevronDown, Send, Terminal, LogOut, Bot, ExternalLink, ShieldCheck
} from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import VoiceTrade from "@/components/VoiceTrade";
import UnifiedTradeHistory from "@/components/UnifiedTradeHistory";

interface SavedWallet {
  id: string;
  address: string;
  chainId: number;
  chainName: string;
  symbol: string;
  balance: number;
  label: string;
  lastSynced: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [peakBalance, setPeakBalance] = useState(100000.00);
  const [peakBalanceAt, setPeakBalanceAt] = useState(new Date().toISOString());
  const [dbWallets, setDbWallets] = useState<SavedWallet[]>([]);

  const balance = useTradingStore((state) => state.balance) || 0;
  const positions = useTradingStore((state) => state.positions) || [];
  const ticks = useTradingStore((state) => state.ticks) || {};
  const initializeMarketData = useTradingStore((state) => state.initializeMarketData);

  const initialBalance = 100000.00;

  const loadRealUserDatabase = async () => {
    try {
      setIsRefreshing(true);
      
      // 1. Fetch user DB profile and positions
      const res = await fetch('/api/auth/user/me', {
        cache: 'no-store',
        credentials: 'include', 
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await res.json();
      
      if (data.code === "AUTH_FAILED") {
        Cookies.remove("token", { path: "/" });
        router.push("/");
        return;
      }

      if (data.success) {
        useTradingStore.setState({ 
          balance: data.balance, 
          positions: data.positions || [],
          tradeHistory: data.tradeHistory || []
        });
        setPeakBalance(data.peakBalance || initialBalance);
        setPeakBalanceAt(data.peakBalanceAt || new Date().toISOString());
      }

      // 2. Fetch all persistent Web3 Wallets
      const walletRes = await fetch("/api/wallet", {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      });
      const walletData = await walletRes.json();
      if (walletData.success) {
        setDbWallets(walletData.wallets || []);
      }
    } catch (error) {
      console.error("Failed to load user data", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
      return;
    }
    loadRealUserDatabase();
    if (initializeMarketData) initializeMarketData();

    const bc = new BroadcastChannel('apex_trader_sync');
    bc.onmessage = (event) => {
      if (event.data === 'SYNC_DATA') {
        loadRealUserDatabase();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      bc.close();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { totalEquity, totalUnrealizedPnL, totalCostBasis } = useMemo(() => {
    let equity = balance;
    let pnl = 0;
    let costBasis = 0;

    if (positions.length > 0) {
      positions.forEach((pos: any) => {
        const currentPrice = ticks[pos.symbol]?.price || pos.averagePrice;
        const positionValue = currentPrice * pos.shares;
        const positionCost = pos.averagePrice * pos.shares;
        
        equity += positionValue;
        pnl += (positionValue - positionCost);
        costBasis += positionCost;
      });
    }
    return { totalEquity: equity, totalUnrealizedPnL: pnl, totalCostBasis: costBasis };
  }, [balance, positions, ticks]);

  useEffect(() => {
    if (!isMounted || totalEquity <= initialBalance || totalEquity <= peakBalance) return;

    setPeakBalance(totalEquity);
    setPeakBalanceAt(new Date().toISOString());

    const timeoutId = setTimeout(async () => {
      try {
        const detailedReport = positions.map((pos: any) => {
          const currentPrice = ticks[pos.symbol]?.price || pos.averagePrice;
          const value = currentPrice * pos.shares;
          const cost = pos.averagePrice * pos.shares;
          const pnl = value - cost;
          const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
          
          return { symbol: pos.symbol, shares: pos.shares, price: currentPrice, pnl, pnlPct };
        });

        await fetch('/api/auth/user/peak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peakEquity: totalEquity, report: detailedReport })
        });
      } catch (err) {
        console.error("Failed to sync new high-water mark");
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [totalEquity, peakBalance, isMounted, initialBalance, positions, ticks]);

  const peakProfit = peakBalance - initialBalance;
  const peakDate = new Date(peakBalanceAt);
  const formattedPeakDate = peakDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedPeakTime = peakDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatMoney = (val: number) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pnlPercentage = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
  const isOverallProfit = totalUnrealizedPnL >= 0;

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full bg-[#0B0E14] flex items-center justify-center text-[#7C8699]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#2962FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Header */}
      <header className="h-16 border-b border-[#1E222D] bg-[#131722] flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/terminal")} 
            className="text-[#7C8699] hover:text-white transition flex items-center gap-2 bg-[#1E222D] hover:bg-[#2A2E39] px-3 py-1.5 rounded-lg"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Terminal</span>
          </button>
          
          <div className="w-px h-6 bg-[#1E222D]" />
          
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Activity size={18} className="text-[#2962FF]" />
            Performance Dashboard
          </h1>
        </div>
        
        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={loadRealUserDatabase}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-[#7C8699] hover:text-white transition bg-[#1E222D] hover:bg-[#2A2E39] px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#2962FF]" : ""} />
            <span className="hidden sm:inline font-medium">Sync Data</span>
          </button>

          {/* Navigation Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-[#1E222D] hover:bg-[#2A2E39] text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[#2A2E39] transition"
            >
              <span>Navigation</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#131722] border border-[#2A2E39] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setIsMenuOpen(false); router.push("/terminal"); }} className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition">
                  <Terminal size={16} className="text-[#2962FF]" />
                  <span>Trading Terminal</span>
                </button>
                <button onClick={() => { setIsMenuOpen(false); router.push("/wallet"); }} className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition">
                  <Wallet size={16} className="text-[#2962FF]" />
                  <span>Web3 Portfolio</span>
                </button>
                <button onClick={() => { setIsMenuOpen(false); router.push("/copilot"); }} className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition">
                  <Bot size={16} className="text-[#00C853]" />
                  <span>AI Copilot</span>
                </button>
                <button onClick={() => { setIsMenuOpen(false); router.push("/telegram"); }} className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition">
                  <Send size={16} className="text-[#0088cc]" />
                  <span>Telegram Link</span>
                </button>
                <div className="my-1 border-t border-[#1E222D]" />
                <button onClick={() => { Cookies.remove("token", { path: "/" }); router.push("/"); }} className="w-full px-4 py-2.5 text-left text-sm text-[#FF3B30] hover:bg-[#FF3B30]/10 flex items-center gap-3 transition">
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-y-auto custom-scrollbar relative z-10">
        
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#7C8699] mb-2">
              <Wallet size={16} />
              <span className="text-sm font-medium uppercase">Available Cash</span>
            </div>
            <span className="text-3xl font-mono font-bold">${formatMoney(balance)}</span>
          </div>

          <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#7C8699] mb-2">
              <Briefcase size={16} />
              <span className="text-sm font-medium uppercase">Total Equity</span>
            </div>
            <span className="text-3xl font-mono font-bold">${formatMoney(totalEquity)}</span>
          </div>

          <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#7C8699] mb-2">
              <TrendingUp size={16} />
              <span className="text-sm font-medium uppercase">Unrealized PnL</span>
            </div>
            <div className="flex items-end gap-3">
              <span className={`text-3xl font-mono font-bold ${isOverallProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                {isOverallProfit ? '+' : '-'}${formatMoney(Math.abs(totalUnrealizedPnL))}
              </span>
              <span className={`text-sm font-medium mb-1.5 ${isOverallProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                ({isOverallProfit ? '+' : ''}{pnlPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="bg-[#131722] border border-[#00C853]/30 rounded-xl p-5 flex flex-col gap-1 relative overflow-hidden shadow-[0_0_20px_rgba(0,200,83,0.05)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00C853]/10 blur-2xl rounded-full translate-x-8 -translate-y-8" />
            <div className="flex items-center gap-2 text-[#00C853] mb-2 relative z-10">
              <Award size={16} />
              <span className="text-sm font-medium uppercase">High-Water Mark</span>
            </div>
            <span className="text-3xl font-mono font-bold text-white relative z-10">
              +{formatMoney(Math.abs(peakProfit))}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#7C8699] mt-1 relative z-10">
              <Clock size={12} className="text-[#00C853]" />
              {formattedPeakDate} • {formattedPeakTime}
            </div>
          </div>
        </div>

        {/* Linked Web3 Wallets Condition Card */}
        <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2 text-white">
              <Wallet size={16} className="text-[#2962FF]" />
              Linked Web3 Wallets Condition ({dbWallets.length})
            </h2>
            <button 
              onClick={() => router.push("/wallet")} 
              className="text-xs text-[#2962FF] hover:underline flex items-center gap-1"
            >
              Add / Manage Wallets <ExternalLink size={12} />
            </button>
          </div>

          {dbWallets.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[#1E222D] rounded-lg">
              <p className="text-xs text-[#7C8699]">
                No Web3 wallets linked yet. Go to <span className="text-[#2962FF] cursor-pointer" onClick={() => router.push("/wallet")}>Web3 Portfolio</span> to link your wallet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbWallets.map((w) => (
                <div key={w.id} className="bg-[#1A1E29] border border-[#2A2E39] rounded-lg p-4 flex flex-col justify-between hover:border-[#2962FF]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-white truncate">{w.label || "Web3 Wallet"}</span>
                      <span className="flex items-center gap-1 text-[10px] bg-[#00E676]/10 text-[#00E676] px-2 py-0.5 rounded border border-[#00E676]/20 font-medium">
                        <ShieldCheck size={10} /> Active Sync
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[#7C8699]">{w.address.slice(0, 6)}...{w.address.slice(-4)}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-[#2A2E39] flex justify-between items-baseline">
                    <span className="text-xs text-[#7C8699]">{w.chainName}</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {w.balance.toFixed(4)} {w.symbol}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Positions */}
        <div className="bg-[#131722] border border-[#1E222D] rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#1E222D] bg-[#1A1E29]/50 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Briefcase size={16} className="text-[#2962FF]" />
              Current Positions & Holdings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E222D] text-[#7C8699] text-xs uppercase bg-[#0B0E14]">
                  <th className="p-4 font-medium">Asset</th>
                  <th className="p-4 font-medium text-right">Shares / Units</th>
                  <th className="p-4 font-medium text-right">Avg Cost</th>
                  <th className="p-4 font-medium text-right">Live Price</th>
                  <th className="p-4 font-medium text-right">Total Value</th>
                  <th className="p-4 font-medium text-right">Source / Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {positions.length === 0 && dbWallets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#7C8699]">No active positions or wallet assets found.</td>
                  </tr>
                ) : (
                  <>
                    {/* 1. Database Trading Positions */}
                    {positions.map((pos: any) => {
                      const currentPrice = ticks[pos.symbol]?.price || pos.averagePrice;
                      const totalValue = currentPrice * pos.shares;
                      const costBasis = pos.averagePrice * pos.shares;
                      const pnl = totalValue - costBasis;
                      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                      const isPosProfit = pnl >= 0;

                      return (
                        <tr key={pos.symbol} className="border-b border-[#1E222D]/50 hover:bg-[#1E222D]/50 transition-colors">
                          <td className="p-4 font-bold">{pos.symbol}</td>
                          <td className="p-4 text-right font-mono">{pos.shares}</td>
                          <td className="p-4 text-right font-mono">${formatMoney(pos.averagePrice)}</td>
                          <td className="p-4 text-right font-mono">${formatMoney(currentPrice)}</td>
                          <td className="p-4 text-right font-mono">${formatMoney(totalValue)}</td>
                          <td className={`p-4 text-right font-mono font-bold ${isPosProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {isPosProfit ? '+' : ''}${formatMoney(pnl)} ({isPosProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}

                    {/* 2. Persistent Web3 Wallet Positions */}
                    {dbWallets.map((w) => (
                      <tr key={w.id} className="border-b border-[#1E222D]/50 bg-[#2962FF]/[0.02] hover:bg-[#2962FF]/[0.05] transition-colors">
                        <td className="p-4 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{w.symbol}/USD</span>
                            <span className="flex items-center gap-1 text-[10px] bg-[#2962FF]/20 text-[#2962FF] px-2 py-0.5 rounded-full border border-[#2962FF]/30 uppercase tracking-wider font-bold">
                              <Wallet size={10} /> Web3 • {w.label || `${w.address.slice(0, 6)}...`}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-white">{w.balance.toFixed(4)}</td>
                        <td className="p-4 text-right text-[#8B94A5] font-mono">--</td>
                        <td className="p-4 text-right text-[#8B94A5] font-mono">Live Sync</td>
                        <td className="p-4 text-right text-white font-medium font-mono">--</td>
                        <td className="p-4 text-right">
                          <span className="text-xs text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/20 px-2 py-1 rounded-md font-medium">
                            Self-Custody ({w.chainName})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* REPLACED: Unified Trade & Blockchain History */}
        <UnifiedTradeHistory />

      </main>

      {/* Floating Voice Mic */}
      <VoiceTrade />
    </div>
  );
}