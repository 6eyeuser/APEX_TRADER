
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import Cookies from "js-cookie"; 

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({
  open,
  onClose,
  initialMode = "signup",
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(""); 
    }
  }, [open, initialMode]);

  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const payload = mode === "signup" ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      
      
      if (data.token) {
        Cookies.set("token", data.token, { path: "/" });
      } else {
        
        
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const mockPayload = btoa(JSON.stringify({ name: mode === "signup" ? name : "Trader" }));
        const mockJwt = `${header}.${mockPayload}.mock_signature`;
        Cookies.set("token", mockJwt, { path: "/" });
      }

      onClose();
      router.push("/terminal");
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-panel bg-surface p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`text-sm font-medium transition ${
                    mode === "signup"
                      ? "text-ink border-b-2 border-bull pb-1"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`text-sm font-medium transition ${
                    mode === "login"
                      ? "text-ink border-b-2 border-bull pb-1"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Log In
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="opacity-60 hover:opacity-100 transition"
                aria-label="Close"
              >
                <X size={18} className="text-ink" />
              </button>
            </div>

            {}
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            {}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-muted">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kartik Yadav"
                    className="mt-1 w-full rounded-lg border border-panel bg-[#0B0E14] px-3 py-2 text-sm text-ink placeholder:text-muted/40 focus:border-bull focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  className="mt-1 w-full rounded-lg border border-panel bg-[#0B0E14] px-3 py-2 text-sm text-ink placeholder:text-muted/40 focus:border-bull focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-panel bg-[#0B0E14] px-3 py-2 text-sm text-ink placeholder:text-muted/40 focus:border-bull focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 rounded-lg py-2.5 text-sm font-medium bg-bull text-[#052012] transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "signup" ? "Create free account" : "Log in to terminal"}
              </button>
            </form>

            <p className="text-[11px] mt-3 text-center text-muted">
              {mode === "signup"
                ? "Funded with 100,000.00 simulated USD on signup. No real funds involved."
                : "Access your persistent trading wallet & session."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}