// ws-server.mjs
import { Server } from "socket.io";
import Redis from "ioredis";

// Connect to local Redis container as a subscriber
const redisSubscriber = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

// Start the WebSocket Server for frontend clients
const io = new Server(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

console.log("🟢 WebSocket Consumer Fleet Node running on port 3001");

// Subscribe to the Redis market data channel
redisSubscriber.subscribe("MARKET_UPDATE", (err, count) => {
  if (err) {
    console.error("Failed to subscribe to Redis:", err);
  } else {
    console.log(`✅ Subscribed successfully to Redis (Channel count: ${count})`);
  }
});

// When Redis receives a tick from the Ingester, blast it to clients

redisSubscriber.on("message", (channel, message) => {
  if (channel === "MARKET_UPDATE") {
    const tick = JSON.parse(message);
    io.emit("price_update", tick);
  }
});

// Handle frontend connections
io.on("connection", (socket) => {
  console.log(`💻 Client connected to firehose: ${socket.id}`);
  socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`));
});