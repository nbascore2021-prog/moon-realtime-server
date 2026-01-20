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
let signedInStudents = []; // 存储签到的学生信息

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

// 处理 WebSocket 连接
wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // 🔁 新设备一连上来，先同步已签到的学生信息
  ws.send(
    JSON.stringify({
      type: "syncSignedInStudents",
      students: signedInStudents, // 把签到的学生列表发给新连接的客户端
    })
  );

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // =========================
    // 2️⃣ 学生签到
    // =========================
    if (data.type === "studentSignedIn" && data.name) {
      const studentName = data.name;

      // 将签到的学生添加到签到列表中
      if (!signedInStudents.includes(studentName)) {
        signedInStudents.push(studentName);
        console.log(`学生签到成功：${studentName}`);
      }

      // 广播给所有连接的客户端，更新签到的学生列表
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "updateSignedInStudents",
              students: signedInStudents, // 广播新的签到列表
            })
          );
        }
      });
      return;
    }
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

// 启动服务器
server.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});
