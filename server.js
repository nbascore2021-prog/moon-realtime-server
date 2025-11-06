import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running!");
});

wss.on("connection", (ws) => {
  console.log("🔵 A new client connected");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("📡 Received:", data);

    // 广播给所有客户端
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify(data));
    });
  });

  ws.on("close", () => console.log("🔴 Client disconnected"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
