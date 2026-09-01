
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Check, X, Activity } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

export default function VoiceTrade() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [proposedTrade, setProposedTrade] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setVolume(avgVolume);
    
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      analyzeAudio();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setVolume(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processVoiceCommand(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access error", err);
      setErrorMsg("Microphone access denied. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processVoiceCommand = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice.webm");

    try {
      
      const res = await fetch("/api/auth/voice-trade", { 
        method: "POST", 
        body: formData,
        credentials: "include"
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.intent) {
        setTranscript(data.transcript);
        setProposedTrade(data.intent);
      } else {
        setErrorMsg(data.error || "Could not parse trade intent.");
      }
    } catch (err: any) {
      console.error("Voice processing error:", err);
      setErrorMsg(err.message || "Network error processing voice command.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTrade = async () => {
    if (!proposedTrade) return;
    setIsExecuting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: proposedTrade.action,
          symbol: proposedTrade.symbol,
          shares: Number(proposedTrade.amount) || 1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        
        const bc = new BroadcastChannel("apex_trader_sync");
        bc.postMessage("SYNC_DATA");
        bc.close();
        setProposedTrade(null);
      } else {
        setErrorMsg(data.error || "Order execution failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute order.");
    } finally {
      setIsExecuting(false);
    }
  };

  const dynamicScale = 1 + volume / 80;
  const dynamicGlow = `0 0 ${volume * 1.5}px ${volume / 2}px rgba(41, 98, 255, ${Math.min(volume / 120, 0.9)})`;

  return (
    <>
      {}
      {isRecording && (
        <div className="fixed inset-0 z-[100] bg-[#0B0E14]/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Listening...</h2>
            <p className="text-[#7C8699]">e.g., &quot;Buy 10 shares of Apple&quot; or &quot;Sell 5 AMD&quot;</p>
          </div>

          <button
            onMouseUp={stopRecording}
            onTouchEnd={stopRecording}
            style={{ 
              transform: `scale(${dynamicScale})`,
              boxShadow: dynamicGlow 
            }}
            className="w-32 h-32 rounded-full bg-[#2962FF] flex items-center justify-center transition-all duration-75 ease-out shadow-2xl"
          >
            <Mic className="w-12 h-12 text-white" />
          </button>
          
          <p className="absolute bottom-12 text-[#7C8699] text-sm animate-pulse">
            Release when done speaking
          </p>
        </div>
      )}

      {}
      <div className={`fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4 transition-opacity duration-300 ${isRecording ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        
        {}
        {errorMsg && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/50 text-[#FF3B30] px-4 py-3 rounded-xl text-sm max-w-sm shadow-xl backdrop-blur-md flex items-start gap-2 animate-in slide-in-from-bottom-3">
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        )}

        {}
        {proposedTrade && (
          <div className="w-84 bg-[#131722]/95 backdrop-blur-xl border border-[#1E222D] rounded-2xl p-6 shadow-2xl transform transition-all animate-in slide-in-from-bottom-5 duration-300 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${proposedTrade.action === "BUY" ? "bg-[#00C853]" : "bg-[#FF3B30]"}`} />
            
            <div className="flex items-center gap-2 mb-3 text-[#7C8699]">
              <Activity size={16} className="text-[#2962FF]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Voice Order Detected</span>
            </div>
            
            <p className="text-sm text-gray-300 italic mb-5 bg-[#1A1E29] p-3 rounded-lg border border-[#2A2E39]">
              &quot;{transcript}&quot;
            </p>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${proposedTrade.action === "BUY" ? "text-[#00C853]" : "text-[#FF3B30]"}`}>
                  {proposedTrade.action}
                </span>
                <span className="text-2xl font-mono font-bold text-white">{proposedTrade.symbol}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-[#7C8699] uppercase tracking-wider mb-1">Quantity</span>
                <span className="text-xl font-mono font-bold text-white">
                  {proposedTrade.amount} <span className="text-sm text-[#7C8699]">shrs</span>
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={confirmTrade} 
                disabled={isExecuting}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition shadow-lg disabled:opacity-50 ${
                  proposedTrade.action === "BUY" 
                    ? "bg-[#00C853] hover:bg-[#00E676] text-[#0B0E14]" 
                    : "bg-[#FF3B30] hover:bg-[#FF453A] text-white"
                }`}
              >
                {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Confirm Order</>}
              </button>
              <button 
                onClick={() => setProposedTrade(null)} 
                disabled={isExecuting}
                className="px-4 bg-[#1A1E29] hover:bg-[#2A2E39] text-[#7C8699] hover:text-white rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {}
        <div className="relative group flex items-center justify-center w-18 h-18">
          <button
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 bg-[#131722]/80 backdrop-blur-md border-[#2962FF] hover:bg-[#2962FF] hover:border-[#4477FF] shadow-[0_0_25px_rgba(41,98,255,0.35)] hover:shadow-[0_0_35px_rgba(41,98,255,0.6)] group-hover:-translate-y-0.5"
          >
            {isProcessing ? (
              <Loader2 className="text-white w-7 h-7 animate-spin" />
            ) : (
              <Mic className="w-7 h-7 text-[#2962FF] group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}