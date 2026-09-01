// ingester.mjs
import WebSocket from "ws";
import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

// Connect to local Redis container
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

console.log("📡 Ingester started: Connecting to Alpaca & Redis...");

const alpaca = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");

alpaca.on("open", () => {
  console.log("🔗 Connected to Alpaca Market Stream");
  
  alpaca.send(JSON.stringify({
    action: "auth",
    key: process.env.ALPACA_API_KEY,
    secret: process.env.ALPACA_API_SECRET
  }));
});

alpaca.on("message", (data) => {
  const messages = JSON.parse(data);
  
  messages.forEach(msg => {
    if (msg.T === "success" && msg.msg === "authenticated") {
      console.log("✅ Alpaca Auth Success! Subscribing to tickers...");
      alpaca.send(JSON.stringify({
        action: "subscribe",
        trades: ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN"]
      }));
    }

    if (msg.T === "t") {
      const tick = {
        symbol: msg.S,
        price: msg.p,
        size: msg.s,
        timestamp: msg.t
      };
      
      // PUBLISH the raw tick to the Redis channel immediately
      redis.publish("MARKET_UPDATE", JSON.stringify(tick));
    }
  });
});

alpaca.on("error", (err) => console.error("Alpaca WS Error:", err));
alpaca.on("close", () => console.log("Alpaca connection closed"));