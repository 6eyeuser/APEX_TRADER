
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { decodeJwt } from "jose";
import { ChevronDown, LayoutDashboard, Settings, HelpCircle, LogOut, Wallet } from "lucide-react";

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Trader");
  const [menuOpen, setMenuOpen] = useState(false);

  
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      try {
        const decoded = decodeJwt(token);
        if (decoded && decoded.name) {
          setUserName(decoded.name as string);
        }
        setIsLoggedIn(true);
      } catch (e) {
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove("token");
    setIsLoggedIn(false);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/85 backdrop-blur-md border-b border-[#1E222D]">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
        
        {}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C853]" />
          <span className="font-bold text-lg tracking-tight text-white">ApexTrader</span>
        </Link>
        
        {}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-[#131722] border border-[#1E222D] hover:border-[#00C853]/50 px-3 py-1.5 rounded-lg text-sm transition text-white"
              >
                <div className="w-6 h-6 rounded-full bg-[#00C853]/20 text-[#00C853] flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium max-w-[120px] truncate">{userName}</span>
                <ChevronDown size={14} className="text-[#7C8699]" />
              </button>

              {}
              {menuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-52 bg-[#131722] border border-[#1E222D] rounded-xl shadow-2xl py-2 z-50"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#1E222D]">
                    <p className="text-[11px] uppercase tracking-wide text-[#7C8699]">Logged in as</p>
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                  </div>

                  <Link
                    href="/terminal"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-[#1E222D] transition"
                  >
                    <LayoutDashboard size={16} className="text-[#00C853]" />
                    <span>Trading Terminal</span>
                  </Link>

                  <Link
                    href="/wallet"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-[#1E222D] transition"
                  >
                    <Wallet size={16} className="text-[#2962FF]" />
                    <span>Web3 Portfolio</span>
                  </Link>

                  <button
                    onClick={() => { alert("Settings feature section arriving in next step"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] transition text-left"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => { alert("Support desk section arriving in next step"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] transition text-left"
                  >
                    <HelpCircle size={16} />
                    <span>Support</span>
                  </button>

                  <div className="border-t border-[#1E222D] my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition text-left"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="hidden sm:block text-sm font-medium text-[#7C8699] hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-bold rounded-lg px-4 py-2 bg-[#00C853] text-[#052012] transition-all hover:bg-[#00E676] shadow-[0_0_15px_rgba(0,200,83,0.2)] hover:shadow-[0_0_25px_rgba(0,200,83,0.4)]"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}