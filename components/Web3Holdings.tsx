"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";
import { Wallet, ExternalLink } from "lucide-react";

export default function Web3Holdings() {
  const { address, isConnected, chain } = useAccount();
  
  const { data: balance, isLoading } = useBalance({
    address,
  });

  return (
    <div className="bg-[#131722] border border-[#1E222D] rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2962FF]/10 rounded-lg text-[#2962FF]">
            <Wallet size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">External Web3 Wallet</h2>
        </div>
        
        <ConnectButton />
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-[#1A1E29] border border-[#2A2E39] rounded-xl flex justify-between items-center">
            <div>
              <p className="text-xs text-[#8B94A5] mb-1 font-medium uppercase tracking-wider">
                Network
              </p>
              <p className="text-sm font-semibold text-white">
                {chain?.name || "Unknown Chain"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B94A5] mb-1 font-medium uppercase tracking-wider">
                Native Balance
              </p>
              <div className="flex items-baseline gap-1 justify-end">
                {isLoading ? (
                  <div className="h-5 w-20 bg-[#2A2E39] animate-pulse rounded"></div>
                ) : (
                  <>
                    <p className="text-lg font-bold text-white">
                      {parseFloat(balance?.formatted || "0").toFixed(4)}
                    </p>
                    <p className="text-sm font-medium text-[#00E5FF]">
                      {balance?.symbol}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <a 
            href={chain?.blockExplorers?.default?.url ? `${chain.blockExplorers.default.url}/address/${address}` : `https://etherscan.io/address/${address}`}
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-[#8B94A5] hover:text-[#2962FF] transition-colors"
          >
            View on Block Explorer <ExternalLink size={12} />
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-[#2A2E39] rounded-xl bg-[#1A1E29]/30">
          <Wallet size={32} className="text-[#5A657A] mb-3" />
          <p className="text-[#8B94A5] text-sm max-w-[250px]">
            Connect your Web3 wallet to sync and view your decentralized holdings on ApexTrader.
          </p>
        </div>
      )}
    </div>
  );
}