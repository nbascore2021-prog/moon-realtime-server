import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * =========================
 * 全局共享状态（Server 真源）
 * =========================
 */
let vipHomework = [];
let vipTuition = [];
let currentStudent = ""; // 当前正在上的学生（只显示）

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // 🔁 新设备一连上来，先同步所有状态
  ws.send(JSON.stringify({
    type: "syncVIP",
    homework: vipHomework,
    tuition: vipTuition
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

    /**
     * =========================
     * 1️⃣ 当前学生同步（最重要）
     * =========================
     */
    if (data.type === "setCurrentStudent") {
      currentStudent = data.student || "";

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncCurrentStudent",
            student: currentStudent
          }));
        }
      });
      return;
    }

    /**
     * =========================
     * 2️⃣ 状态广播（Available / Occupied / Done）
     * =========================
     */
    if (data.teacher && data.status) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
      return;
    }

    let changed = false;

    /**
     * =========================
     * 3️⃣ 加入 VIP（功课 / 补习）
     * =========================
     */
    if (data.type === "addVIP" && data.name && data.listType) {
      const list =
        data.listType === "homework" ? vipHomework : vipTuition;

      const exists = list.some(
        v => v.toLowerCase() === data.name.toLowerCase()
      );

      if (!exists) {
        list.push(data.name);
        console.log(`➕ VIP added (${data.listType}):`, data.name);
        changed = true;
      }
    }

    /**
     * =========================
     * 4️⃣ 删除 VIP（功课 / 补习）
     * =========================
     */
    if (data.type === "removeVIP" && data.name && data.listType) {
      if (data.listType === "homework") {
        vipHomework = vipHomework.filter(
          v => v.toLowerCase() !== data.name.toLowerCase()
        );
      } else {
        vipTuition = vipTuition.filter(
          v => v.toLowerCase() !== data.name.toLowerCase()
        );
      }
      console.log(`➖ VIP removed (${data.listType}):`, data.name);
      changed = true;
    }

    /**
     * =========================
     * 5️⃣ 有变动才广播 VIP（避免乱跳）
     * =========================
     */
    if (changed) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncVIP",
            homework: vipHomework,
            tuition: vipTuition
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});
