
"use client";

import { useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createStorage } from "wagmi";

import { mainnet, polygon, optimism, arbitrum, base, sepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "ApexTrader",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", 
chains: [mainnet, sepolia, polygon, optimism, arbitrum, base],
  ssr: false,
  
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#2962FF" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}