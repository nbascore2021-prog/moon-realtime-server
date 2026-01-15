import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let vipStudents = []; // ✅ 全局唯一数据源
let currentStudent = "";

wss.on("connection", (ws) => {
  console.log("🔵 client connected");

  // 新客户端 → 主动下发当前状态
  ws.send(JSON.stringify({
    type: "syncVIP",
    vipStudents
  }));

  ws.send(JSON.stringify({
    type: "syncCurrentStudent",
    student: currentStudent
  }));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    // ===== VIP =====
    if (data.type === "syncVIP") {
      vipStudents = data.vipStudents;

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncVIP",
            vipStudents
          }));
        }
      });
    }

    // ===== 当前学生 =====
    if (data.type === "setCurrentStudent") {
      currentStudent = data.student;

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "syncCurrentStudent",
            student: currentStudent
          }));
        }
      });
    }
  });
});

server.listen(process.env.PORT || 3000);
