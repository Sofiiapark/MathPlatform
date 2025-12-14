// backend/src/user/src/rabbitmq-connector.ts

import * as amqp from 'amqplib';
import { Span, propagation, context } from '@opentelemetry/api';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = "math_platform_exchange";
let connection: amqp.Connection;
let channel: amqp.Channel;
let reconnectAttempts = 0;
let shuttingDown = false;
// Reconnect/backoff config
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

// ---------------- Helper ----------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function backoffMs(attempts: number) {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
}

// Підключення до RabbitMQ
export async function connectRabbitMQ() {
    console.log('[RabbitMQ] Connecting...');
     const conn = (await amqp.connect(RABBITMQ_URL)) as any;
     connection = conn;
          reconnectAttempts = 0;
    
          conn.on("error", (err) => console.error("[RABBIT] Connection error:", err));
          conn.on("close", async () => {
            console.warn("[RABBIT] Connection closed");
            if (!shuttingDown) {
              connection = null;
              channel = null;
              reconnectAttempts++;
              const wait = backoffMs(reconnectAttempts);
              console.log(`[RABBIT] Reconnecting in ${wait}ms...`);
              await sleep(wait);
              await connectRabbitMQ();
            }
          });
    
          // Явний каст до Channel
          const ch = (await conn.createChannel()) as amqp.Channel;
          channel = ch;
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('[RabbitMQ] Connected and exchange asserted.');
    return channel;
}

// Публікація події module.completed
export async function publishModuleCompleted(
    currentChannel: amqp.Channel, 
    payload: { userId: string, moduleId: string }, 
    span: Span // Потрібен для передачі Trace Context
) {
    const routingKey = 'module.completed';
    const message = JSON.stringify(payload);
    
    // Створення заголовків для передачі Trace Context
    const headers: { [key: string]: string } = {};
    
    // Інжект поточного контексту (Span) у заголовки
    propagation.inject(
        context.active(), // Отримуємо активний контекст (поточний Span)
        headers
    );
    
    // Публікація повідомлення із заголовками
    currentChannel.publish(
        EXCHANGE_NAME, 
        routingKey, 
        Buffer.from(message), 
        { headers: headers }
    );
    span.setAttribute('event.published.key', routingKey);
    console.log(`[RabbitMQ] Published event: ${routingKey}`);
}