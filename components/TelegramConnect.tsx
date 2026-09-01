
"use client";

import { useState } from "react";

export default function TelegramConnect() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/telegram/link", {
        method: "POST",
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setCode(data.code);
      } else {
        setError(data.error || "Failed to generate link code.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-white max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.12.03-1.99 1.26-5.61 3.71-.53.37-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.41-1.43-.87.03-.24.38-.48 1.04-.73 4.08-1.78 6.8-2.92 8.16-3.48 3.88-1.61 4.69-1.89 5.22-1.9.12 0 .38.03.52.14.12.1.16.23.18.34-.01.07-.01.19-.02.31z"/>
        </svg>
        <h2 className="text-xl font-semibold">Connect Telegram</h2>
      </div>
      
      <p className="text-gray-400 text-sm mb-6">
        Link your Telegram account to execute trades directly via chat messages.
      </p>

      {!code ? (
        <button
          onClick={generateCode}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Link Code"}
        </button>
      ) : (
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-400 mb-2">Send this code to the bot:</p>
          <div className="text-3xl font-mono tracking-widest font-bold text-blue-400 mb-3">
            {code}
          </div>
          <p className="text-xs text-gray-500">
            Message <strong>@ApexTrade_assistant_bot</strong> with: <br/>
            <code className="bg-gray-900 px-2 py-1 rounded mt-1 inline-block">/link {code}</code>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}