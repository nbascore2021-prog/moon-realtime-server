import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* =========================
   🔒 全局状态（重点）
========================= */
let currentStudent = "";
let vipStudents = [];

/* =========================
   HTTP 测试接口
========================= */
app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running!");
});

/* =========================
   WebSocket 逻辑
========================= */
wss.on("connection", (ws) => {
  console.log("🔵 A new client connected");

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    console.log("📡 Received:", data);

    /* 🔹 新设备请求当前学生名字 */
    if (data.type === "getCurrentStudent") {
      ws.send(
        JSON.stringify({
          type: "syncCurrentStudent",
          student: currentStudent,
        })
      );
      return;
    }

    /* 🔹 设置当前学生名字（所有设备同步） */
    if (data.type === "setCurrentStudent") {
      currentStudent = data.student || "";

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "syncCurrentStudent",
              student: currentStudent,
            })
          );
        }
      });
      return;
    }

    /* 🔹 VIP 学生同步 */
    if (data.type === "syncVIP") {
      vipStudents = Array.isArray(data.vipStudents)
        ? data.vipStudents
        : [];

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "syncVIP",
              vipStudents,
            })
          );
        }
      });
      return;
    }

    /* 🔹 其他普通状态广播（房间 / 老师 / 状态按钮） */
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

/* =========================
   启动服务器
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
