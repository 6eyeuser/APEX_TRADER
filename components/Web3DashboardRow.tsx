
"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { Wallet } from "lucide-react";

export default function Web3DashboardRow() {
  
  const [isMounted, setIsMounted] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  if (!isMounted) return null;
  
  
  if (!isConnected || !balance) return null;

  const shares = parseFloat(balance.formatted);
  
  if (shares === 0) return null;

  return (
    <tr className="border-b border-[#1E222D]/50 bg-[#2962FF]/[0.02] hover:bg-[#2962FF]/[0.05] transition-colors">
      <td className="py-4 px-4 text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{balance.symbol}/USD</span>
          <span className="flex items-center gap-1 text-[10px] bg-[#2962FF]/20 text-[#2962FF] px-2 py-0.5 rounded-full border border-[#2962FF]/30 uppercase tracking-wider font-bold">
            <Wallet size={10} /> Web3
          </span>
        </div>
      </td>

      <td className="py-4 px-4 text-right font-mono text-white">
        {shares.toFixed(4)}
      </td>

      <td className="py-4 px-4 text-right text-[#8B94A5] font-mono">
        --
      </td>

      <td className="py-4 px-4 text-right text-[#8B94A5] font-mono">
        Live Sync
      </td>

      <td className="py-4 px-4 text-right text-white font-medium font-mono">
        --
      </td>

      <td className="py-4 px-4 text-right">
        <span className="text-xs text-[#8B94A5] bg-[#1A1E29] px-2 py-1 rounded-md border border-[#2A2E39]">
          Self-Custody
        </span>
      </td>
    </tr>
  );
}