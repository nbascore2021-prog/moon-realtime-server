import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * ✅ 全局共享状态
 * 只有 VIP 是全局
 */
let vipStudents = [];

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // ✅ 新设备只同步 VIP（不包含 current student）
  ws.send(JSON.stringify({
    type: "syncVIP",
    vipStudents
  }));

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    /* ✅ 处理学生签到信息并广播给所有客户端 */
    if (data.type === "studentSignIn") {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "studentSignIn",
            name: data.name,
            grade: data.grade,
            status: data.status,
            date: data.date,
            timestamp: data.timestamp
          }));
        }
      });
      return;
    }

    let changed = false;

    /* ===== 新增 VIP（大小写不敏感） ===== */
    if (data.type === "addVIP" && data.name) {
      const exists = vipStudents.some(
        v => v.toLowerCase() === data.name.toLowerCase()
      );
      if (!exists) {
        vipStudents.push(data.name);
        console.log("➕ VIP added:", data.name);
        changed = true;
      }
    }

    /* ===== 删除 VIP ===== */
    if (data.type === "removeVIP" && data.name) {
      const before = vipStudents.length;
      vipStudents = vipStudents.filter(
        v => v.toLowerCase() !== data.name.toLowerCase()
      );
      if (vipStudents.length !== before) {
        console.log("➖ VIP removed:", data.name);
        changed = true;
      }
    }

    /* ===== 广播 VIP（只有有变化才广播） ===== */
    if (changed) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncVIP",
            vipStudents
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
