
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import CopilotCard from "@/components/terminal/CopilotCard";

export default function CopilotPage() {
  const router = useRouter();

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden relative font-sans">
      {}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#131722] via-[#050505] to-black" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2962FF]/50 to-transparent z-10" />
      
      {}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1E222D_1px,transparent_1px),linear-gradient(to_bottom,#1E222D_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_80%,transparent_100%)]" />

      {}
      <header className="h-14 bg-black/40 backdrop-blur-md border-b border-[#1E222D]/80 px-6 flex items-center justify-between shrink-0 z-20 relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push("/terminal")}
            className="group flex items-center gap-2 text-xs font-semibold text-[#7C8699] hover:text-[#00E5FF] transition-all duration-300"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>TERMINAL</span>
          </button>
          <div className="h-4 w-[1px] bg-[#2A2E39]" />
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#2962FF] animate-pulse" />
            <h1 className="text-xs font-bold tracking-[0.2em] text-[#E2E8F0]">
              APEX <span className="text-[#2962FF]">WAR ROOM</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1.5 rounded shadow-[0_0_10px_rgba(0,230,118,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping" />
          GLOBAL NETWORK SYNCED
        </div>
      </header>

      {}
      <main className="flex-1 w-full h-full z-10 flex flex-col relative">
        {}
        <CopilotCard fullScreen={true} />
      </main>
    </div>
  );
}