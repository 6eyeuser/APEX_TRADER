"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { Web3Provider } from "@/components/Web3Provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </Web3Provider>
  );
}

export default Providers;