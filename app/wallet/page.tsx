"use client";
export const dynamic = "force-dynamic";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, ShieldCheck, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
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

export default function WalletPage() {
  const [isMounted, setIsMounted] = useState(false);
  
  const { address, isConnected, chain, connector } = useAccount();
  const { data: balanceData, refetch } = useBalance({ address });
  const { chains, switchChain } = useSwitchChain();
  
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSavedWallets = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (data.success) {
        setSavedWallets(data.wallets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchSavedWallets(true);
  }, []);

  const handleSaveOrSyncWallet = async () => {
    if (!address) return;
    setIsSaving(true);
    try {
      const balanceRes = await refetch();
      const currentBalance = parseFloat(balanceRes.data?.formatted || balanceData?.formatted || "0");
      const currentSymbol = balanceRes.data?.symbol || balanceData?.symbol || "ETH";
      const walletBrand = connector?.name || "Web3";

      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          chainId: chain?.id || 1,
          chainName: chain?.name || "Ethereum",
          symbol: currentSymbol,
          balance: currentBalance,
          label: `${walletBrand} Wallet`,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        await fetchSavedWallets(false);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      await fetch("/api/wallet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSavedWallets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const isCurrentWalletLinked = savedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && w.chainId === chain?.id
  );

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white font-sans pb-12">
      <nav className="sticky top-0 z-50 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-[#1E222D]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-[#1A1E29] hover:bg-[#2A2E39] rounded-lg transition-colors text-[#8B94A5] hover:text-white">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Multi-Wallet Manager</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-[#2962FF]/10 text-[#2962FF] rounded-full border border-[#2962FF]/20">
            <Wallet size={14} />
            {savedWallets.length} Saved {savedWallets.length === 1 ? "Wallet" : "Wallets"}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1E222D]">
            <div>
              <h2 className="text-xl font-bold">Connect & Link Wallet</h2>
              <p className="text-xs text-[#8B94A5] mt-1">Connect any browser wallet to register or sync it with your ApexTrader account.</p>
            </div>
            <ConnectButton />
          </div>

          {isMounted && isConnected && address && (
            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between bg-[#1A1E29] p-4 rounded-xl gap-4 border border-[#2A2E39]">
              <div>
                <p className="text-xs text-[#8B94A5] uppercase font-semibold">Active Session Wallet ({connector?.name || "Web3"})</p>
                <p className="font-mono text-sm text-white">{address}</p>
                <p className="text-xs text-[#2962FF] font-medium mt-1">
                  Network: {chain?.name || "Ethereum"} | Balance: {parseFloat(balanceData?.formatted || "0").toFixed(4)} {balanceData?.symbol}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {chain?.id !== 11155111 && switchChain && (
                  <button
                    onClick={() => switchChain({ chainId: 11155111 })}
                    className="px-3 py-2 bg-[#2A2E39] hover:bg-[#3A3E49] text-white rounded-lg text-xs font-semibold transition"
                  >
                    Switch to Sepolia
                  </button>
                )}
                <button
                  onClick={handleSaveOrSyncWallet}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2962FF] hover:bg-[#1E50D8] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isCurrentWalletLinked ? "Sync Balance to DB" : "Save to My Account"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#131722] border border-[#1E222D] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1E222D] bg-[#1A1E29]/50 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#00C853]" />
              Persistent Linked Wallets
            </h3>
            <button onClick={() => fetchSavedWallets(false)} className="text-xs text-[#8B94A5] hover:text-white flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-[#8B94A5]">Loading saved wallets...</div>
          ) : savedWallets.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8B94A5]">No wallets saved yet. Connect a wallet above and click "Save to My Account".</div>
          ) : (
            <div className="divide-y divide-[#1E222D]">
              {savedWallets.map((w) => (
                <div key={w.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#1E222D]/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#2962FF]/10 text-[#2962FF] rounded-lg">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{w.label || "Web3 Wallet"}</span>
                        <span className="text-[10px] bg-[#1E222D] text-[#8B94A5] px-2 py-0.5 rounded border border-[#2A2E39] font-mono">
                          {w.chainName}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-[#8B94A5] mt-0.5">{w.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="font-mono font-bold text-white text-sm">{w.balance.toFixed(4)} {w.symbol}</p>
                      <p className="text-[10px] text-[#7C8699]">Synced {new Date(w.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWallet(w.id)}
                      className="p-2 text-[#7C8699] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition"
                      title="Unlink wallet"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unified Blockchain and Trade History */}
        <UnifiedTradeHistory />

      </div>
    </main>
  );
}