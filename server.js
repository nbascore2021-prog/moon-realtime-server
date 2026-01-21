import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * =========================
 * 服务器端 WebSocket 功能
 * =========================
 */

// 处理 WebSocket 连接
wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // 新设备一连接，发送空的学生名单（不需要签到功能）
  ws.send(
    JSON.stringify({
      type: "syncSignedInStudents",
      students: [], // 初始时不发送任何学生数据
    })
  );

  // 监听收到的消息
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // 如果有其他消息需要处理（暂时不需要学生签到功能）
    // 你可以在这里添加额外的消息处理逻辑

  });

  // 客户端断开连接
  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

// 启动服务器
server.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});
