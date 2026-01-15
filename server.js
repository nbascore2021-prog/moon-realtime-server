import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* ======================
   全局状态（唯一真相）
====================== */
let vipStudents = [];
let currentStudent = "";

/* ======================
   HTTP 健康检查
====================== */
app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

/* ======================
   WebSocket 逻辑
====================== */
wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  /* 🔹 新客户端一连接，只下发当前状态（只读） */
  ws.send(JSON.stringify({
    type: "syncVIP",
    vipStudents
  }));

  ws.send(JSON.stringify({
    type: "syncCurrentStudent",
    student: currentStudent
  }));

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    /* ========= VIP 更新 ========= */
    if (data.type === "syncVIP") {
      // ❗防止新设备用空数组覆盖服务器
      if (Array.isArray(data.vipStudents) && data.vipStudents.length > 0) {
        vipStudents = data.vipStudents;
        console.log("⭐ VIP updated:", vipStudents);
      } else {
        // 忽略空数组
        return;
      }
    }

    /* ===== 当前学生更新 ===== */
    if (data.type === "setCurrentStudent") {
      currentStudent = data.student || "";
      console.log("🧑 Current student:", currentStudent);
    }

    /* ========= 广播最新状态 ========= */
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: "syncVIP",
          vipStudents
        }));
        client.send(JSON.stringify({
          type: "syncCurrentStudent",
          student: currentStudent
        }));
      }
    });
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

/* ======================
   启动服务器
====================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
