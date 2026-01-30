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
  type: "syncAll",
  vipStudents,
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

/* ===== VIP 顺序（方案二核心） ===== */
if (data.type === "moveVIPToEnd" && data.name) {
  const name = data.name.trim();

  vipStudents = vipStudents.filter(
    v => v.toLowerCase() !== name.toLowerCase()
  );
  vipStudents.push(name);

  const payload = JSON.stringify({
    type: "syncVIPOrder",
    vipStudents
  });

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });

  return; // ✅ 阻断 syncAll
}

/* ===== VIP 增删 ===== */
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

  /* ===== 广播（统一 syncAll） ===== */
  if (changed) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: "syncAll",
          vipStudents,
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
