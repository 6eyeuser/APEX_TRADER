// app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Users, Activity, ShieldAlert, X, FileText, Clock, Briefcase } from "lucide-react";
import Link from "next/link";

export default function AdminPortal() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || "Failed to load users");
        }
      } catch (err) {
        setError("Network error connecting to Admin API");
      }
    };
    fetchUsers();
  }, []);

  const formatMoney = (val: number) => {
    return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white">
        <div className="text-center bg-[#131722] p-8 rounded-xl border border-[#FF3B30]/30">
          <ShieldAlert size={48} className="text-[#FF3B30] mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-[#7C8699] mb-6">{error}</p>
          <Link href="/terminal" className="bg-[#2962FF] px-6 py-2 rounded-lg font-bold">Return to Terminal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-8 font-sans relative">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <ShieldAlert className="text-[#00C853]" /> System Administration
            </h1>
            <p className="text-[#7C8699] mt-1">Monitor all registered users, ledgers, and platform activity.</p>
          </div>
          <Link href="/terminal" className="bg-[#131722] border border-[#1E222D] hover:bg-[#1E222D] px-4 py-2 rounded-lg transition font-bold text-sm">
            Exit Admin
          </Link>
        </header>

        <div className="bg-[#131722] border border-[#1E222D] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1E29]/50 border-b border-[#1E222D] text-[#7C8699] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Account Balance</th>
                <th className="px-6 py-4">Total Trades</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222D]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#1E222D]/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{user.name}</div>
                    <div className="text-xs text-[#7C8699]">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-[#00C853]">
                    ${formatMoney(user.balance)}
                  </td>
                  <td className="px-6 py-4 text-[#7C8699]">
                    <Activity size={14} className="inline mr-1" />
                    {user._count.trades} executions
                  </td>
                  <td className="px-6 py-4 text-[#7C8699]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-[#2962FF]/20 text-[#2962FF]'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="bg-[#2962FF]/10 text-[#2962FF] hover:bg-[#2962FF]/20 px-3 py-1.5 rounded text-xs font-bold transition"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-[#131722] border border-[#1E222D] rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b border-[#1E222D] flex items-center justify-between bg-[#1A1E29]/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="text-[#2962FF]" /> {selectedUser.name}
                </h2>
                <p className="text-sm text-[#7C8699]">{selectedUser.email} • Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-[#7C8699] hover:text-white transition p-2 bg-[#1E222D] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
              
              {/* Left Column: Ledger & Accounting */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase text-[#7C8699] flex items-center gap-2 border-b border-[#1E222D] pb-2">
                  <FileText size={16} /> Double-Entry Ledger History
                </h3>
                {selectedUser.ledgerLines?.length === 0 ? (
                  <p className="text-xs text-[#7C8699]">No ledger activity.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedUser.ledgerLines?.map((line: any) => (
                      <div key={line.id} className="bg-[#0B0E14] border border-[#1E222D] p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white mb-0.5">{line.journalEntry?.description || line.journalEntry?.type}</div>
                          <div className="text-[10px] text-[#7C8699] font-mono">{line.accountId} • {new Date(line.createdAt).toLocaleString()}</div>
                        </div>
                        <div className={`text-sm font-mono font-bold ${line.direction === 'CREDIT' ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                          {line.direction === 'CREDIT' ? '+' : '-'}${formatMoney(line.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Positions & Orders */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold uppercase text-[#7C8699] flex items-center gap-2 border-b border-[#1E222D] pb-2">
                    <Briefcase size={16} /> Current Portfolio
                  </h3>
                  {selectedUser.positions?.length === 0 ? (
                    <p className="text-xs text-[#7C8699]">No open positions.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedUser.positions?.map((pos: any) => (
                        <div key={pos.id} className="bg-[#0B0E14] border border-[#1E222D] p-3 rounded-lg">
                          <div className="font-bold text-white">{pos.symbol}</div>
                          <div className="text-xs text-[#7C8699]">{pos.shares} shares @ ${formatMoney(pos.averagePrice)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold uppercase text-[#7C8699] flex items-center gap-2 border-b border-[#1E222D] pb-2">
                    <Clock size={16} /> Pending Orders (Escrowed)
                  </h3>
                  {selectedUser.orders?.length === 0 ? (
                    <p className="text-xs text-[#7C8699]">No pending orders.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedUser.orders?.map((order: any) => (
                        <div key={order.id} className="bg-[#0B0E14] border border-[#1E222D] p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 ${order.side === 'BUY' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'}`}>
                              {order.side} {order.type}
                            </span>
                            <span className="font-bold text-sm text-white">{order.symbol}</span>
                            <div className="text-xs text-[#7C8699] mt-1">Target: ${formatMoney(order.targetPrice)} • Qty: {order.shares}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}