import express from "express";
import * as amqp from "amqplib";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import * as dotenv from "dotenv";

// Завантажити змінні середовища з .env файлу
dotenv.config();

// ---------------- KONSTANTY ----------------
const EXCHANGE = "math_platform_exchange";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const PORT = Number(process.env.PORT || 3000);

// Reconnect/backoff config
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

// ---------------- GLOBALS ----------------
let rabbitConnection: amqp.Connection | null = null;
let rabbitChannel: amqp.Channel | null = null;
let reconnectAttempts = 0;
let shuttingDown = false;

// Map clientID -> WebSocket
const clients: Map<string, WebSocket> = new Map();

// ---------------- Express + CORS ----------------
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:8080", credentials: true }));
app.use(express.json());

// HTTP server for both Express and WS
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ---------------- Helper ----------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function backoffMs(attempts: number) {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
}

// ---------------- RabbitMQ connect with retry ----------------
async function connectRabbitWithRetry() {
  while (!shuttingDown) {
    try {
      console.log(`[RABBIT] Connecting to ${RABBITMQ_URL}...`);

      // Явний каст до Connection
      const conn = (await amqp.connect(RABBITMQ_URL)) as any;
      rabbitConnection = conn;
      reconnectAttempts = 0;

      conn.on("error", (err) => console.error("[RABBIT] Connection error:", err));
      conn.on("close", async () => {
        console.warn("[RABBIT] Connection closed");
        if (!shuttingDown) {
          rabbitConnection = null;
          rabbitChannel = null;
          reconnectAttempts++;
          const wait = backoffMs(reconnectAttempts);
          console.log(`[RABBIT] Reconnecting in ${wait}ms...`);
          await sleep(wait);
          await connectRabbitWithRetry();
        }
      });

      // Явний каст до Channel
      const ch = (await conn.createChannel()) as amqp.Channel;
      rabbitChannel = ch;
      await ch.assertExchange(EXCHANGE, "topic", { durable: true });

      console.log("[RABBIT] Connected and channel created.");
      await setupResponseConsumer();

      return;
    } catch (err) {
      reconnectAttempts++;
      const wait = backoffMs(reconnectAttempts);
      console.error(`[RABBIT] Connect failed (attempt ${reconnectAttempts}), retry in ${wait}ms`, err);
      await sleep(wait);
    }
  }
}

// ---------------- Publish helper ----------------
async function sendEvent(route: string, payload: any) {
  if (!rabbitChannel) throw new Error("RabbitMQ channel not ready");
  const full = { payload, timestamp: new Date().toISOString() };
  rabbitChannel.publish(EXCHANGE, route, Buffer.from(JSON.stringify(full)), { persistent: true });
  console.log(`[PUB] ${route} ->`, full);
}

// ---------------- Consumer for async responses ----------------
async function setupResponseConsumer() {
  if (!rabbitChannel) throw new Error("Channel not ready");

  const { queue } = await rabbitChannel.assertQueue("", { exclusive: true });
  await rabbitChannel.bindQueue(queue, EXCHANGE, "ai.answer.*");
  await rabbitChannel.bindQueue(queue, EXCHANGE, "quiz.testCompleted.*");

  rabbitChannel.prefetch(10);

  rabbitChannel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const parsed = JSON.parse(msg.content.toString());
      const clientId = parsed.clientID || parsed.payload?.clientID;
      const routingKey = msg.fields.routingKey;

      if (!clientId) {
        console.warn(`[CONSUMER] No clientID in message ${routingKey}`);
        rabbitChannel.nack(msg, false, false);
        return;
      }

      const ws = clients.get(clientId);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn(`[CONSUMER] Client ${clientId} not connected`);
        rabbitChannel.nack(msg, false, false);
        return;
      }

      ws.send(JSON.stringify(parsed));
      rabbitChannel.ack(msg);
      console.log(`[CONSUMER] Sent to client ${clientId} (routing=${routingKey})`);
    } catch (err) {
      console.error("[CONSUMER] Error processing message:", err);
      rabbitChannel.nack(msg, false, false);
    }
  }, { noAck: false });
}

// ---------------- WebSocket ----------------
function attachWebSocketHandlers() {
  wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).slice(2, 9);
    clients.set(clientId, ws);
    console.log(`[WS] Client connected: ${clientId}`);

    ws.send(JSON.stringify({ type: "connected", clientID: clientId }));

    ws.on("pong", () => {});
    ws.on("message", (data) => {
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : JSON.parse(data.toString());
        if (parsed?.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    ws.on("error", (err) => {
      console.warn(`[WS] Error for client ${clientId}:`, err);
      try { ws.close(); } catch {}
      clients.delete(clientId);
    });
  });

  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try { client.ping(); } catch {}
      }
    });
  }, 30000);
}

// ---------------- Express routes ----------------
app.post("/api/register", async (req, res) => {
  try {
    await sendEvent("auth.register", { user: req.body });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/register error:", err);
    res.status(500).json({ ok: false });
  }
});

app.post("/api/takeTest", async (req, res) => {
  try {
    const { testId, clientID } = req.body;
    if (!clientID) return res.status(400).json({ ok: false, error: "clientID required" });
    await sendEvent("quiz.takeTest", { testId, clientID });
    res.json({ ok: true, message: "Test submitted, awaiting results." });
  } catch (err) {
    console.error("/api/takeTest error:", err);
    res.status(500).json({ ok: false });
  }
});

app.post("/api/ai", async (req, res) => {
  try {
    const { question, clientID } = req.body;
    if (!clientID) return res.status(400).json({ ok: false, error: "clientID required" });
    await sendEvent(`ai.ask.${clientID}`, { question, clientID });
    res.json({ ok: true, message: "AI request accepted, awaiting response." });
  } catch (err) {
    console.error("/api/ai error:", err);
    res.status(500).json({ ok: false });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    rabbitConnected: !!rabbitConnection && !!rabbitChannel,
    clients: clients.size,
  });
});

// ---------------- Graceful shutdown ----------------
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[SHUTDOWN] Initiating...");

  try {
    wss.clients.forEach((c) => { try { c.close(); } catch {} });
    wss.close();
    server.close();

    if (rabbitChannel) { try { await rabbitChannel.close(); } catch {} }
    if (rabbitConnection) { try { await (rabbitConnection as any).close(); } catch {} }
  } catch (err) {
    console.error("[SHUTDOWN] Error:", err);
  } finally {
    console.log("[SHUTDOWN] Exiting process.");
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------- Start ----------------
async function start() {
  attachWebSocketHandlers();
  await connectRabbitWithRetry();
  server.listen(PORT, () => console.log(`API Gateway listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start API Gateway:", err);
  process.exit(1);
});
