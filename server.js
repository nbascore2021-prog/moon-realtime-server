import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* ===== 全局状态（唯一真相） ===== */
let currentStudent = "";

let vipHomeworkStudents = [];
let vipTuitionStudents = [];

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // ✅ 新设备：同步全部状态
  ws.send(JSON.stringify({
    type: "syncVIP",
    homework: vipHomeworkStudents,
    tuition: vipTuitionStudents
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

    /* ===== 当前学生 ===== */
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

    let changed = false;

    /* ===== 新增 VIP ===== */
    if (data.type === "addVIP" && data.name && data.listType) {
      const list =
        data.listType === "homework"
          ? vipHomeworkStudents
          : vipTuitionStudents;

      const exists = list.some(
        v => v.toLowerCase() === data.name.toLowerCase()
      );

      if (!exists) {
        list.push(data.name);
        changed = true;
        console.log(`➕ VIP (${data.listType}):`, data.name);
      }
    }

    /* ===== 删除 VIP ===== */
    if (data.type === "removeVIP" && data.name && data.listType) {
      const list =
        data.listType === "homework"
          ? vipHomeworkStudents
          : vipTuitionStudents;

      const before = list.length;
      const filtered = list.filter(
        v => v.toLowerCase() !== data.name.toLowerCase()
      );

      if (before !== filtered.length) {
        if (data.listType === "homework") {
          vipHomeworkStudents = filtered;
        } else {
          vipTuitionStudents = filtered;
        }
        changed = true;
        console.log(`➖ VIP (${data.listType}):`, data.name);
      }
    }

    /* ===== 广播 VIP 更新 ===== */
    if (changed) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncVIP",
            homework: vipHomeworkStudents,
            tuition: vipTuitionStudents
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
