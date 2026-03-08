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
let currentStudents = [];

app.get("/", (req, res) => {
res.send("✅ Moon Tuition Realtime Server is running");
});

wss.on("connection", (ws) => {
console.log("🔵 Client connected");

// ✅ 新设备只同步 VIP（不包含 current student）
ws.send(JSON.stringify({
  type: "syncAll",
  vipStudents,
  currentStudents
}));

ws.on("message", (message) => {
  let data;
  try {
    data = JSON.parse(message);
  } catch {
    return;
  }

  /* ✅ 老师状态广播 */
  if (data.teacher && data.status) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
    return;
  }

  let changed = false;

  /* ===== VIP ===== */
  if (data.type === "addVIP" && data.name) {
    const exists = vipStudents.some(
      v => v.toLowerCase() === data.name.toLowerCase()
    );
    if (!exists) {
      vipStudents.push(data.name);
      changed = true;
    }
  }

  if (data.type === "removeVIP" && data.name) {
    const before = vipStudents.length;
    vipStudents = vipStudents.filter(
      v => v.toLowerCase() !== data.name.toLowerCase()
    );
    if (vipStudents.length !== before) {
      changed = true;
    }
  }

  /* ===== Current Students ===== */
  if (data.type === "addCurrent" && data.name) {
    const exists = currentStudents.some(
      n => n.toLowerCase() === data.name.toLowerCase()
    );
    if (!exists) {
      currentStudents.push(data.name);
      changed = true;
    }
  }

  if (data.type === "removeCurrent" && data.name) {
    const before = currentStudents.length;
    currentStudents = currentStudents.filter(
      n => n.toLowerCase() !== data.name.toLowerCase()
    );
    if (currentStudents.length !== before) {
      changed = true;
    }
  }

/* ✅👇👇👇 就在这里贴这段 👇👇👇 */

/* ===== Current Student（单一） ===== */
if (data.type === "setCurrentStudent") {
  if (data.student && data.student.trim() !== "") {
    // 只允许 1 个当前学生
    currentStudents = [data.student.trim()];
  } else {
    // 清空当前学生
    currentStudents = [];
  }
  changed = true;
}

/* ===== Student Done（统一回收） ===== */
if (data.type === "studentDone" && data.name) {
  const name = data.name.trim();
  if (!name) return;

  // 1️⃣ 从 currentStudents 移除
  currentStudents = currentStudents.filter(
    n => n.toLowerCase() !== name.toLowerCase()
  );

  // 2️⃣ 加回 VIP（末端，避免重复）
  const exists = vipStudents.some(
    v => v.toLowerCase() === name.toLowerCase()
  );
  if (!exists) {
    vipStudents.push(name);
  }

  changed = true;
}

  /* ===== 广播（统一 syncAll） ===== */
  if (changed) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: "syncAll",
          vipStudents,
          currentStudents
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
