const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MODULES = new Set(["FI", "CO", "MM", "SD", "HCM", "Basis"]);
const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_PER_ROOM = 100;
const MESSAGE_RATE_LIMIT = 8;
const MESSAGE_RATE_WINDOW_MS = 5000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 16 * 1024,
  allowRequest(request, callback) {
    const origin = request.headers.origin;
    if (!origin) {
      callback(null, true);
      return;
    }

    try {
      callback(null, new URL(origin).host === request.headers.host);
    } catch {
      callback(null, false);
    }
  }
});

const messageHistory = new Map();
const activeUsers = new Map();

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use((request, response, next) => {
  if (["/server.js", "/desktop-main.js", "/package.json", "/package-lock.json"].includes(request.path)) {
    response.sendStatus(404);
    return;
  }
  next();
});

app.use(express.static(__dirname, { index: "index.html" }));

function roomName(moduleName) {
  return `community:${moduleName}`;
}

function getRoomHistory(moduleName) {
  if (!messageHistory.has(moduleName)) {
    messageHistory.set(moduleName, []);
  }
  return messageHistory.get(moduleName);
}

function getRoomMembers(moduleName) {
  return [...activeUsers.values()]
    .filter((user) => user.module === moduleName)
    .map((user) => user.username);
}

function broadcastPresence(moduleName) {
  const members = getRoomMembers(moduleName);
  io.to(roomName(moduleName)).emit("community:presence", {
    module: moduleName,
    count: members.length,
    members
  });
}

io.on("connection", (socket) => {
  socket.on("community:join", async (payload, acknowledge = () => {}) => {
    const moduleName = typeof payload?.module === "string" ? payload.module : "";
    const username = typeof payload?.username === "string"
      ? payload.username.trim().replace(/\s+/g, " ")
      : "";

    if (!MODULES.has(moduleName)) {
      acknowledge({ ok: false, error: "Select a valid SAP module." });
      return;
    }

    if (!/^[\p{L}\p{N} ._-]{2,24}$/u.test(username)) {
      acknowledge({ ok: false, error: "Name must be 2–24 letters or numbers." });
      return;
    }

    const previousUser = activeUsers.get(socket.id);
    if (previousUser) {
      await socket.leave(roomName(previousUser.module));
      activeUsers.delete(socket.id);
      broadcastPresence(previousUser.module);
    }

    await socket.join(roomName(moduleName));
    activeUsers.set(socket.id, { username, module: moduleName });
    acknowledge({
      ok: true,
      module: moduleName,
      messages: getRoomHistory(moduleName),
      count: getRoomMembers(moduleName).length,
      members: getRoomMembers(moduleName)
    });
    broadcastPresence(moduleName);
  });

  socket.on("community:message", (payload, acknowledge = () => {}) => {
    const user = activeUsers.get(socket.id);
    if (!user) {
      acknowledge({ ok: false, error: "Join a module before sending messages." });
      return;
    }

    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      acknowledge({ ok: false, error: `Message must be 1–${MAX_MESSAGE_LENGTH} characters.` });
      return;
    }

    const now = Date.now();
    const recentMessages = (socket.data.messageTimestamps || [])
      .filter((timestamp) => now - timestamp < MESSAGE_RATE_WINDOW_MS);

    if (recentMessages.length >= MESSAGE_RATE_LIMIT) {
      socket.data.messageTimestamps = recentMessages;
      acknowledge({ ok: false, error: "You're sending messages too quickly. Please wait a few seconds." });
      return;
    }

    recentMessages.push(now);
    socket.data.messageTimestamps = recentMessages;

    const message = {
      username: user.username,
      text,
      sentAt: new Date(now).toISOString()
    };
    const history = getRoomHistory(user.module);
    history.push(message);
    if (history.length > MAX_MESSAGES_PER_ROOM) {
      history.splice(0, history.length - MAX_MESSAGES_PER_ROOM);
    }

    io.to(roomName(user.module)).emit("community:message", message);
    acknowledge({ ok: true });
  });

  socket.on("disconnect", () => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    activeUsers.delete(socket.id);
    broadcastPresence(user.module);
  });
});

function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      const address = server.address();
      console.log(`SAP Interview Practice server listening on ${host}:${address.port}`);
      resolve(address.port);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Could not start SAP Interview Practice server", error);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
