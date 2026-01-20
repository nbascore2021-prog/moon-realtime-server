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

// 存储签到的学生信息
let signedInStudents = []; // 这个数组存储签到的学生姓名

app.get("/", (req, res) => {
  res.send("✅ Moon Tuition Realtime Server is running");
});

// 处理 WebSocket 连接
wss.on("connection", (ws) => {
  console.log("🔵 Client connected");

  // 🔁 新设备一连上来，先同步所有状态
  ws.send(
    JSON.stringify({
      type: "syncVIP",
      homework: vipHomework,
      tuition: vipTuition,
    })
  );

  // 发送当前签到的学生信息
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
    // 1️⃣ 当前学生同步（最重要）
    // =========================
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

    /**
     * =========================
     * 3️⃣ 状态广播（Available / Occupied / Done）
     * =========================
     */
    if (data.teacher && data.status) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
      return;
    }

    let changed = false;

    /**
     * =========================
     * 4️⃣ 加入 VIP（功课 / 补习）
     * =========================
     */
    if (data.type === "addVIP" && data.name && data.listType) {
      const list =
        data.listType === "homework" ? vipHomework : vipTuition;

      const exists = list.some(
        (v) => v.toLowerCase() === data.name.toLowerCase()
      );

      if (!exists) {
        list.push(data.name);
        console.log(`➕ VIP added (${data.listType}):`, data.name);
        changed = true;
      }
    }

    /**
     * =========================
     * 5️⃣ 删除 VIP（功课 / 补习）
     * =========================
     */
    if (data.type === "removeVIP" && data.name && data.listType) {
      if (data.listType === "homework") {
        vipHomework = vipHomework.filter(
          (v) => v.toLowerCase() !== data.name.toLowerCase()
        );
      } else {
        vipTuition = vipTuition.filter(
          (v) => v.toLowerCase() !== data.name.toLowerCase()
        );
      }
      console.log(`➖ VIP removed (${data.listType}):`, data.name);
      changed = true;
    }

    /**
     * =========================
     * 6️⃣ 有变动才广播 VIP（避免乱跳）
     * =========================
     */
    if (changed) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "syncVIP",
              homework: vipHomework,
              tuition: vipTuition,
            })
          );
        }
      });
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
