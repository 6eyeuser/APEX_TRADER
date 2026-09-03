"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, ArrowRightLeft, Loader2, History, Wallet } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

interface TradeRecord {
  id: string | number;
  timestamp: number;
  symbol: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  isWeb3?: boolean;
  walletAddress?: string;
  explorerUrl?: string;
}

interface SavedWallet {
  id: string;
  address: string;
  label?: string;
}

export default function UnifiedTradeHistory() {
  const { address: activeAddress, isConnected } = useAccount();
  
  // FIXED: Safely grab trades from either property name and normalize timestamps
  const rawDbTrades = useTradingStore((state: any) => state.tradeHistory || state.trades) || [];
  
  const dbTrades: TradeRecord[] = useMemo(() => {
    return rawDbTrades.map((t: any) => ({
      id: t.id,
      timestamp: t.createdAt ? new Date(t.createdAt).getTime() : Date.now(),
      symbol: t.symbol,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.total,
      isWeb3: false,
    }));
  }, [rawDbTrades]);
  
  const [web3Trades, setWeb3Trades] = useState<TradeRecord[]>([]);
  const [isLoadingWeb3, setIsLoadingWeb3] = useState(false);
  const [dbWallets, setDbWallets] = useState<SavedWallet[]>([]);

  // Fetch all persistent wallets saved in the DB
  useEffect(() => {
    const fetchDbWallets = async () => {
      try {
        const res = await fetch("/api/wallet", { cache: "no-store" });
        const data = await res.json();
        if (data.success && Array.isArray(data.wallets)) {
          setDbWallets(data.wallets);
        }
      } catch (err) {
        console.error("Failed to load saved wallets:", err);
      }
    };
    fetchDbWallets();
  }, []);

  // Fetch on-chain history for MetaMask active session + all saved DB wallets
  useEffect(() => {
    const addressSet = new Set<string>();
    if (isConnected && activeAddress) {
      addressSet.add(activeAddress.toLowerCase());
    }
    dbWallets.forEach((w) => {
      if (w.address) addressSet.add(w.address.toLowerCase());
    });

    const targetAddresses = Array.from(addressSet);
    if (targetAddresses.length === 0) {
      setWeb3Trades([]);
      return;
    }

    const fetchAllWeb3History = async () => {
      setIsLoadingWeb3(true);
      try {
        const query = targetAddresses.join(",");
        const res = await fetch(`/api/wallet/history?addresses=${query}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          const validTransfers = data.transactions.filter((tx: TradeRecord) => tx.total > 0);
          setWeb3Trades(validTransfers);
        }
      } catch (error) {
        console.error("Error syncing multi-wallet history:", error);
      } finally {
        setIsLoadingWeb3(false);
      }
    };

    fetchAllWeb3History();
  }, [activeAddress, isConnected, dbWallets]);

  // Merge off-chain database trades and on-chain Web3 wallet transfers
  const unifiedLedger = useMemo(() => {
    const combined = [...(dbTrades || []), ...web3Trades];
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [dbTrades, web3Trades]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  };

  const getWalletDisplayName = (address?: string) => {
    if (!address) return "Web3 Wallet";
    if (activeAddress && address.toLowerCase() === activeAddress.toLowerCase()) {
      return "MetaMask (Active)";
    }
    const matched = dbWallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
    if (matched?.label) return matched.label;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-[#131722] border border-[#1E222D] rounded-xl flex flex-col overflow-hidden shadow-xl">
      <div className="p-4 border-b border-[#1E222D] bg-[#1A1E29]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#2962FF]" />
          <h3 className="font-bold text-white tracking-wide">Unified Activity & Trade Ledger</h3>
        </div>
        {isLoadingWeb3 && (
          <div className="flex items-center gap-2 text-xs text-[#7C8699]">
            <Loader2 size={12} className="animate-spin text-[#2962FF]" />
            Syncing MetaMask & Linked Wallets...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B0E14] text-[#7C8699] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Action / Type</th>
              <th className="px-6 py-4 font-semibold">Asset / Origin</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold text-right">Quantity</th>
              <th className="px-6 py-4 font-semibold text-right">Price</th>
              <th className="px-6 py-4 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E222D]/60 text-sm">
            {unifiedLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#7C8699]">
                  <ArrowRightLeft size={32} className="mx-auto mb-3 opacity-20" />
                  <p>No orders or blockchain wallet transactions found.</p>
                </td>
              </tr>
            ) : (
              unifiedLedger.map((trade, idx) => (
                <tr key={`${trade.id}-${idx}`} className="hover:bg-[#1A1E29]/30 transition-colors group">
                  
                  {/* Action Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {trade.isWeb3 ? (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded border flex items-center gap-1.5 w-fit ${
                        trade.action === "WEB3_RECEIVE" 
                          ? "bg-[#00C853]/10 text-[#00E676] border-[#00C853]/30" 
                          : "bg-[#2962FF]/10 text-[#4477FF] border-[#2962FF]/30"
                      }`}>
                        <Wallet size={11} />
                        {trade.action === "WEB3_RECEIVE" ? "RECEIVED" : "SENT"}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded border inline-block ${
                        trade.action === 'BUY' 
                          ? 'bg-[#00C853]/10 text-[#00E676] border-[#00C853]/20' 
                          : 'bg-[#FF3B30]/10 text-[#FF453A] border-[#FF3B30]/20'
                      }`}>
                        {trade.action}
                      </span>
                    )}
                  </td>

                  {/* Asset & Source */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{trade.symbol}</span>
                      {trade.isWeb3 ? (
                        <span className="text-[11px] text-[#7C8699] font-mono bg-[#1E222D] px-2 py-0.5 rounded border border-[#2A2E39]">
                          {getWalletDisplayName(trade.walletAddress)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7C8699] bg-[#1E222D] px-2 py-0.5 rounded border border-[#2A2E39]">
                          Terminal Order
                        </span>
                      )}
                      {trade.isWeb3 && trade.explorerUrl && (
                        <a 
                          href={trade.explorerUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C8699] hover:text-[#2962FF]"
                          title="View on Etherscan"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Date Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-[#7C8699]">
                    {formatDate(trade.timestamp)}
                  </td>

                  {/* Quantity Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-white">
                    {trade.shares.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                  </td>

                  {/* Execution Price Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[#7C8699]">
                    {trade.isWeb3 ? "—" : `$${trade.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  </td>

                  {/* Total Value Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-medium text-white">
                    {trade.isWeb3 ? (
                      `${trade.total.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`
                    ) : (
                      `$${trade.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    )}
                  </td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}