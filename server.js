import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let vipStudents = [];
let currentStudent = "";

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // 新设备：只读
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

    /* ===== 新增 VIP ===== */
    if (data.type === "addVIP" && data.name) {
      if (!vipStudents.includes(data.name)) {
        vipStudents.push(data.name);
        console.log("➕ VIP added:", data.name);
      }
    }

    /* ===== 删除 VIP ===== */
    if (data.type === "removeVIP" && data.name) {
      vipStudents = vipStudents.filter(v => v !== data.name);
      console.log("➖ VIP removed:", data.name);
    }

    /* ===== 当前学生 ===== */
    if (data.type === "setCurrentStudent") {
      currentStudent = data.student || "";
    }

    /* ===== 广播唯一真相 ===== */
    wss.clients.forEach(client => {
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
});

server.listen(process.env.PORT || 3000);
