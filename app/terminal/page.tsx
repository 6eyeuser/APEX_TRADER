"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { io } from "socket.io-client";
import { 
  LogOut, Activity, Wallet, Plus, X, Search,
  TrendingUp, TrendingDown, ChevronDown, 
  PanelRightClose, ShoppingCart, Loader2, Trash2,
  Bot, Send, BarChart2, LineChart, Activity as AreaChart
} from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import TradingChart from "@/components/terminal/TradingChart";
import NewsPanel from "@/components/terminal/NewsPanel";

export default function TerminalPage() {
  const router = useRouter();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);
  
  // Order Engine State
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT">("MARKET");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [rightPanelTab, setRightPanelTab] = useState<"portfolio" | "orders">("portfolio");

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState<number | string>(1);
  
  // NEW: Chart Type State
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');

  const activeSymbol = useTradingStore((state) => state.activeSymbol);
  const setActiveSymbol = useTradingStore((state) => state.setActiveSymbol);
  const ticks = useTradingStore((state) => state.ticks);
  const balance = useTradingStore((state) => state.balance);
  const positions = useTradingStore((state) => state.positions);
  const orders = useTradingStore((state) => state.orders);
  const fetchOrders = useTradingStore((state) => state.fetchOrders);
  const cancelOrder = useTradingStore((state) => state.cancelOrder);
  const initializeMarketData = useTradingStore((state) => state.initializeMarketData);

  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(340);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const [chartHeightPx, setChartHeightPx] = useState<number>(420);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  // Dragging logic for left panel
  useEffect(() => {
    if (isDraggingLeft) {
      const handleMouseMove = (e: MouseEvent) => setLeftWidth(Math.max(240, Math.min(e.clientX, 450)));
      const handleMouseUp = () => setIsDraggingLeft(false);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [isDraggingLeft]);

  // Dragging logic for right panel
  useEffect(() => {
    if (isDraggingRight) {
      const handleMouseMove = (e: MouseEvent) => setRightWidth(Math.max(280, Math.min(window.innerWidth - e.clientX, 480)));
      const handleMouseUp = () => setIsDraggingRight(false);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [isDraggingRight]);

  // Dragging logic for vertical chart sizing
  useEffect(() => {
    if (isDraggingVertical) {
      const handleMouseMove = (e: MouseEvent) => {
        const min = 240; 
        const max = window.innerHeight - 150; 
        const val = Math.max(min, Math.min(e.clientY - 60, max)); 
        setChartHeightPx(val);
      };
      const handleMouseUp = () => setIsDraggingVertical(false);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [isDraggingVertical]);

  // Auth & Initial Data Fetching
  useEffect(() => {
    const token = Cookies.get("token");
    
    if (!token) {
      router.push("/");
      return;
    }

    const loadRealUserDatabase = async () => {
      try {
        const res = await fetch('/api/auth/user/me', {
          cache: 'no-store',
          credentials: 'include', 
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        const data = await res.json();
        
        if (data.code === "AUTH_FAILED") {
          Cookies.remove("token", { path: "/" });
          router.push("/");
          return;
        }

        if (data.success) {
          useTradingStore.setState({ 
            balance: data.balance, 
            positions: data.positions || [],
            tradeHistory: data.tradeHistory || useTradingStore.getState().tradeHistory || []
          });
        }
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };
    
    loadRealUserDatabase();

    if (initializeMarketData) {
      initializeMarketData();
    }

    // Click outside handler for dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // WebSocket Firehose Connection
  useEffect(() => {
    const socket = io("http://localhost:3001");
    
    socket.on("connect", () => {
      console.log("Connected to Terminal WebSocket Firehose!");
    });

    socket.on("price_update", (tick) => {
      useTradingStore.setState((state) => ({
        ticks: {
          ...state.ticks,
          [tick.symbol]: {
            symbol: tick.symbol,
            price: tick.price,
            bid: tick.price * 0.9999,
            ask: tick.price * 1.0001,
            change: 0
          }
        }
      }));
    });

    socket.on("connect_error", (err) => {
      console.warn("WebSocket Connection Error. Make sure streamer.mjs is running on port 3001.", err);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOrderSubmit = async (action: 'BUY' | 'SELL') => {
    const shares = Number(orderQuantity);
    const currentPrice = ticks[activeSymbol]?.price || 0;

    if (shares <= 0 || currentPrice <= 0) return;

    setIsProcessingTrade(true);

    try {
      if (orderType === "MARKET") {
        const res = await fetch('/api/auth/trade', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, symbol: activeSymbol, shares, currentPrice })
        });
        
        if (!res.ok) {
          const text = await res.text().catch(() => 'Unknown error');
          alert(`Trade Failed (${res.status}): ${text}`);
          return;
        }

        const data = await res.json();
        if (data.success) {
          useTradingStore.setState((state) => ({ 
            balance: data.balance, 
            positions: data.positions || [],
            tradeHistory: data.tradeHistory || state.tradeHistory
          }));
          setOrderQuantity(1);
          const bc = new BroadcastChannel('apex_trader_sync');
          bc.postMessage('SYNC_DATA');
        } else {
          alert(`Trade Failed: ${data.error || 'Unknown error'}`);
        }
      } else {
        // Limit or Stop Order Submission
        const price = Number(targetPrice) || currentPrice;
        const res = await fetch('/api/auth/orders', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: activeSymbol,
            side: action,
            type: orderType,
            shares,
            targetPrice: price
          })
        });

        const data = await res.json();
        if (data.success) {
          alert(`${orderType} order placed successfully! Cash/Shares secured in escrow.`);
          setOrderQuantity(1);
          setTargetPrice("");
          fetchOrders(); // Refresh pending orders list
        } else {
          alert(`Order Error: ${data.error}`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Network error connecting to trading engine.");
    } finally {
      setIsProcessingTrade(false);
    }
  };

  const handleAddFunds = (amount: number) => {
    useTradingStore.setState((state) => ({ balance: state.balance + amount }));
    setIsDepositOpen(false);
    setCustomAmount("");
  };

  const activeTick = ticks[activeSymbol];
  const activePrice = activeTick?.price || 0;
  const estimatedOrderCost = (Number(orderQuantity) || 0) * (orderType === 'MARKET' ? activePrice : (Number(targetPrice) || activePrice));

  const filteredTicks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const entries = Object.values(ticks);
    if (!query) return entries;
    return entries.filter(
      (tick) => tick.symbol.toLowerCase().includes(query) || (tick.name && tick.name.toLowerCase().includes(query))
    );
  }, [ticks, searchQuery]);

  const { totalEquity } = useMemo(() => {
    let equity = balance || 0;
    if (positions && positions.length > 0) {
      positions.forEach(pos => {
        const currentPrice = ticks[pos.symbol]?.price || pos.averagePrice;
        equity += currentPrice * pos.shares;
      });
    }
    return { totalEquity: equity };
  }, [balance, positions, ticks]);

  const formatMoney = (val: number) => {
    return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pendingOrdersList = useMemo(() => {
    return orders.filter(o => o.status === 'PENDING');
  }, [orders]);

  return (
    <div className={`h-screen w-full bg-[#0B0E14] text-white flex flex-col font-sans overflow-hidden ${isDraggingLeft || isDraggingRight || isDraggingVertical ? 'select-none' : ''}`}>
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#1E222D] bg-[#131722] flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-pulse shadow-[0_0_8px_rgba(0,200,83,0.6)]" />
          <span className="font-bold tracking-tight">ApexTrader Terminal</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/news" 
            className="hidden sm:flex items-center gap-2 bg-[#131722] hover:bg-[#1E222D] border border-[#1E222D] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <span>📰 Market News</span>
          </Link>

          {isRightPanelCollapsed && (
            <button onClick={() => setIsRightPanelCollapsed(false)} className="flex items-center gap-2 bg-[#2962FF] hover:bg-[#1e4ad8] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition shadow-lg animate-fadeIn">
              <ShoppingCart size={14} />
              <span>Buy / Sell Panel</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 bg-[#0B0E14] border border-[#1E222D] px-3 py-1.5 rounded-lg">
            <span className="text-[#7C8699] text-xs">Total Equity:</span>
            <span className="font-mono font-medium text-white text-sm">${formatMoney(totalEquity)}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#0B0E14] border border-[#1E222D] px-3 py-1 rounded-lg">
            <Wallet size={14} className="text-[#00C853]" />
            <span className="font-mono font-medium text-white text-sm">${formatMoney(balance || 0)}</span>
            <button onClick={() => setIsDepositOpen(true)} className="ml-1 flex items-center gap-1 bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] text-xs font-bold px-1.5 py-1 rounded transition">
              <Plus size={14} />
            </button>
          </div>
          
          {/* Universal Navigation Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-[#1E222D] hover:bg-[#2A2E39] text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[#2A2E39] transition"
            >
              <span>Navigation</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#131722] border border-[#2A2E39] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => { setIsMenuOpen(false); router.push("/dashboard"); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition"
                >
                  <Activity size={16} className="text-[#2962FF]" />
                  <span>Performance Dashboard</span>
                </button>

                <button
                  onClick={() => { setIsMenuOpen(false); router.push("/copilot"); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition"
                >
                  <Bot size={16} className="text-[#00C853]" />
                  <span>AI Copilot</span>
                </button>

                <button
                  onClick={() => { setIsMenuOpen(false); router.push("/telegram"); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#7C8699] hover:text-white hover:bg-[#1E222D] flex items-center gap-3 transition"
                >
                  <Send size={16} className="text-[#0088cc]" />
                  <span>Telegram Link</span>
                </button>

                <div className="my-1 border-t border-[#1E222D]" />

                <button
                  onClick={() => {
                    Cookies.remove("token", { path: "/" });
                    router.push("/");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#FF3B30] hover:bg-[#FF3B30]/10 flex items-center gap-3 transition"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden p-2 z-10">
        
        {/* Left Sidebar: Market Watch */}
        <aside style={{ width: leftWidth }} className="bg-[#131722] border border-[#1E222D] rounded-xl flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#1E222D] flex items-center justify-between bg-[#1A1E29]/50">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#7C8699]" />
              <h3 className="text-sm font-medium text-[#7C8699] uppercase tracking-wider">Market Watch</h3>
            </div>
          </div>
          <div className="p-2 border-b border-[#1E222D] bg-[#131722]">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-[#7C8699]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search symbol..." className="w-full bg-[#0B0E14] border border-[#1E222D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C853]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between px-4 py-2 text-[10px] uppercase font-semibold text-[#7C8699] border-b border-[#1E222D] bg-[#131722] sticky top-0 z-10">
              <span className="w-24">Symbol</span>
              <span className="w-20 text-right">Bid</span>
              <span className="w-20 text-right">Ask</span>
            </div>
            <div className="flex flex-col">
              {filteredTicks.map((tick) => {
                const isActive = activeSymbol === tick.symbol;
                const isUp = tick.change >= 0;
                return (
                  <button key={tick.symbol} onClick={() => setActiveSymbol(tick.symbol)} className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors border-b border-[#1E222D]/40 hover:bg-[#1E222D] ${isActive ? 'bg-[#1E222D] border-l-2 border-l-[#00C853]' : 'border-l-2 border-l-transparent'}`}>
                    <span className="font-semibold text-white truncate w-24 text-left">{tick.symbol}</span>
                    <span className={`w-20 text-right font-mono text-[13px] ${isUp ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{tick.bid ? formatMoney(tick.bid) : '---'}</span>
                    <span className={`w-20 text-right font-mono text-[13px] ${isUp ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{tick.ask ? formatMoney(tick.ask) : '---'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* LEFT DRAG HANDLE */}
        <div className={`w-2 cursor-col-resize flex items-center justify-center hover:bg-[#2962FF]/20 transition-colors z-20 group ${isDraggingLeft ? 'bg-[#2962FF]/20' : ''}`} onMouseDown={() => setIsDraggingLeft(true)}>
          <div className={`w-0.5 h-8 rounded-full transition-colors ${isDraggingLeft ? 'bg-[#2962FF]' : 'bg-[#1E222D] group-hover:bg-[#2962FF]'}`} />
        </div>

        {/* Center: Charting Area & News */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          {/* MULTI-TYPE CHART TOOLBAR */}
          <div className="h-12 border border-[#1E222D] bg-[#131722] rounded-t-xl flex items-center px-4 justify-between shrink-0 mb-[-1px] z-10">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-white text-sm">{activeSymbol}</h2>
              <div className="w-px h-4 bg-[#2A2E39]" />
              
              <div className="flex items-center bg-[#0B0E14] border border-[#2A2E39] rounded-lg p-0.5">
                <button 
                  onClick={() => setChartType('candle')}
                  title="Candlestick Chart"
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'candle' ? 'bg-[#2A2E39] text-white' : 'text-[#7C8699] hover:text-white'}`}
                >
                  <BarChart2 size={15} />
                </button>
                <button 
                  onClick={() => setChartType('line')}
                  title="Line Chart"
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'line' ? 'bg-[#2A2E39] text-white' : 'text-[#7C8699] hover:text-white'}`}
                >
                  <LineChart size={15} />
                </button>
                <button 
                  onClick={() => setChartType('area')}
                  title="Area Chart"
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'area' ? 'bg-[#2A2E39] text-white' : 'text-[#7C8699] hover:text-white'}`}
                >
                  <AreaChart size={15} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ height: chartHeightPx }} className="w-full shrink-0 flex flex-col min-h-[240px] border border-[#1E222D] rounded-b-xl overflow-hidden">
            <TradingChart chartType={chartType} symbol={activeSymbol} />
          </div>
          
          <div 
            className={`h-2 w-full shrink-0 cursor-row-resize flex items-center justify-center hover:bg-[#2962FF]/20 transition-colors z-20 group my-1 ${isDraggingVertical ? 'bg-[#2962FF]/20' : ''}`} 
            onMouseDown={() => setIsDraggingVertical(true)}
          >
            <div className={`h-0.5 w-24 rounded-full transition-colors ${isDraggingVertical ? 'bg-[#2962FF]' : 'bg-[#1E222D] group-hover:bg-[#2962FF]'}`} />
          </div>
          
          <div className="flex-1 w-full flex flex-col overflow-hidden min-h-[120px] rounded-xl border border-[#1E222D] [&>*]:h-full [&>*]:flex-1">
            <NewsPanel />
          </div>
        </main>

        {/* RIGHT DRAG HANDLE */}
        {!isRightPanelCollapsed && (
          <div className={`w-2 cursor-col-resize flex items-center justify-center hover:bg-[#2962FF]/20 transition-colors z-20 group ${isDraggingRight ? 'bg-[#2962FF]/20' : ''}`} onMouseDown={() => setIsDraggingRight(true)}>
            <div className={`w-0.5 h-8 rounded-full transition-colors ${isDraggingRight ? 'bg-[#2962FF]' : 'bg-[#1E222D] group-hover:bg-[#2962FF]'}`} />
          </div>
        )}

        {/* Right Sidebar: Trade, Portfolio & Orders */}
        {!isRightPanelCollapsed && (
          <aside style={{ width: rightWidth }} className="bg-[#131722] border border-[#1E222D] rounded-xl flex flex-col gap-2 shrink-0 overflow-hidden p-2">
            <div className="flex items-center justify-between px-2 py-1 bg-[#1A1E29]/50 rounded-lg border border-[#1E222D]">
              <span className="text-xs font-semibold text-[#7C8699] uppercase tracking-wider">Order & Portfolio Manager</span>
              <button onClick={() => setIsRightPanelCollapsed(true)} className="text-[#7C8699] hover:text-white transition p-1 rounded hover:bg-[#1E222D]">
                <PanelRightClose size={16} />
              </button>
            </div>

            {/* Order Entry Panel */}
            <div className="bg-[#0B0E14] border border-[#1E222D] rounded-xl flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#1E222D] bg-[#1A1E29]/50 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#7C8699] uppercase">Order: {activeSymbol}</h3>
                <select 
                  value={orderType} 
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="bg-[#131722] text-white border border-[#1E222D] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#00C853]"
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP_LOSS">Stop Loss</option>
                  <option value="TAKE_PROFIT">Take Profit</option>
                </select>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7C8699]">Quantity</span>
                  <input type="number" min="0" step="any" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} disabled={isProcessingTrade} className="w-24 bg-[#131722] border border-[#1E222D] rounded p-1.5 text-right font-mono text-sm focus:outline-none focus:border-[#00C853]" />
                </div>

                {orderType !== 'MARKET' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7C8699]">Target Price</span>
                    <input type="number" step="any" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder={activePrice.toString()} disabled={isProcessingTrade} className="w-24 bg-[#131722] border border-[#1E222D] rounded p-1.5 text-right font-mono text-sm focus:outline-none focus:border-[#00C853]" />
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-y border-[#1E222D]/50">
                  <span className="text-sm text-[#7C8699]">Est. Value</span>
                  <span className="font-mono text-white">${formatMoney(estimatedOrderCost)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 relative">
                  <button onClick={() => handleOrderSubmit('BUY')} disabled={isProcessingTrade || !activeTick || activePrice <= 0} className="bg-[#00C853] hover:bg-[#00E676] disabled:bg-[#00C853]/50 text-[#052012] font-bold py-2 rounded-lg transition flex items-center justify-center">
                    {isProcessingTrade ? <Loader2 className="animate-spin" size={16} /> : 'BUY'}
                  </button>
                  <button onClick={() => handleOrderSubmit('SELL')} disabled={isProcessingTrade || !activeTick || activePrice <= 0} className="bg-[#FF3B30] hover:bg-[#FF453A] disabled:bg-[#FF3B30]/50 text-white font-bold py-2 rounded-lg transition flex items-center justify-center">
                    {isProcessingTrade ? <Loader2 className="animate-spin" size={16} /> : 'SELL'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs for Portfolio & Pending Orders */}
            <div className="flex-1 bg-[#0B0E14] border border-[#1E222D] rounded-xl flex flex-col overflow-hidden min-h-[180px]">
              <div className="flex border-b border-[#1E222D] bg-[#1A1E29]/50 text-xs font-semibold">
                <button 
                  onClick={() => setRightPanelTab('portfolio')} 
                  className={`flex-1 py-2.5 text-center transition ${rightPanelTab === 'portfolio' ? 'text-white border-b-2 border-[#00C853] bg-[#131722]' : 'text-[#7C8699] hover:text-white'}`}
                >
                  Portfolio ({positions.length})
                </button>
                <button 
                  onClick={() => setRightPanelTab('orders')} 
                  className={`flex-1 py-2.5 text-center transition ${rightPanelTab === 'orders' ? 'text-white border-b-2 border-[#00C853] bg-[#131722]' : 'text-[#7C8699] hover:text-white'}`}
                >
                  Open Orders ({pendingOrdersList.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {rightPanelTab === 'portfolio' ? (
                  !positions || positions.length === 0 ? (
                    <div className="p-6 text-center text-[#7C8699] text-sm flex flex-col items-center gap-2">
                      <p>Your portfolio is empty.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {positions.map(pos => {
                        const currentPrice = ticks[pos.symbol]?.price || pos.averagePrice;
                        const unrealizedPnL = (currentPrice - pos.averagePrice) * pos.shares;
                        const isProfit = unrealizedPnL >= 0;
                        return (
                          <div key={pos.symbol} className="p-3 border-b border-[#1E222D]/50 hover:bg-[#1E222D] transition cursor-pointer" onClick={() => setActiveSymbol(pos.symbol)}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white">{pos.symbol}</span>
                              <span className={`font-mono text-sm font-bold flex items-center gap-1 ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                                {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                ${formatMoney(Math.abs(unrealizedPnL))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[#7C8699]">
                              <span>{pos.shares} Shares @ ${formatMoney(pos.averagePrice)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  pendingOrdersList.length === 0 ? (
                    <div className="p-6 text-center text-[#7C8699] text-sm flex flex-col items-center gap-2">
                      <p>No open limit/stop orders.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {pendingOrdersList.map(order => (
                        <div key={order.id} className="p-3 border-b border-[#1E222D]/50 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.side === 'BUY' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'}`}>
                                {order.side} {order.type}
                              </span>
                              <span className="font-bold text-xs text-white">{order.symbol}</span>
                            </div>
                            <p className="text-[11px] text-[#7C8699]">
                              {order.shares} @ ${formatMoney(order.targetPrice)}
                            </p>
                          </div>
                          <button 
                            onClick={async () => {
                              const res = await cancelOrder(order.id);
                              if (!res.success) alert(res.message);
                            }}
                            className="text-[#7C8699] hover:text-[#FF3B30] transition p-1"
                            title="Cancel Order & Refund Escrow"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
      
      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#131722] border border-[#1E222D] rounded-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Deposit Funds</h3>
            <button onClick={() => setIsDepositOpen(false)} className="absolute top-4 right-4 text-[#7C8699] hover:text-white"><X size={18} /></button>
            <form onSubmit={(e) => { e.preventDefault(); const val = parseFloat(customAmount); if (val > 0) handleAddFunds(val); }}>
              <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Amount..." className="w-full bg-[#0B0E14] border border-[#1E222D] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C853] font-mono mb-4" />
              <button type="submit" className="w-full bg-[#00C853] text-[#052012] font-bold text-sm py-3 rounded-xl transition">Deposit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}