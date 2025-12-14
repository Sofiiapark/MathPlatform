// src/consumer.ts
import amqp, { Connection, Channel,ChannelModel, ConsumeMessage } from "amqplib";
import fs from "fs/promises";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE = "math_platform_exchange";
const PATTERNS = ["platform.*.*", "user.*.*", "student.*.*", "teacher.*.*", "admin.*.*", "ai.*.*"];

async function logError(err: any) {
  const text = err instanceof Error ? err.stack : String(err);
  console.error("[Consumer] Error:", text);
  await fs.appendFile("errors.log", `[${new Date().toISOString()}] ${text}\n`);
}

async function startConsumer() {
  let conn: ChannelModel = null;
  let channel: Channel | null = null;

  try {
    conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    const q = await channel.assertQueue("", { exclusive: true });

    for (const pattern of PATTERNS) {
      await channel.bindQueue(q.queue, EXCHANGE, pattern);
    }

    console.log(`✅ Connected to RabbitMQ. Listening on ${EXCHANGE}...`);

    channel.consume(
        q.queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;
          const routingKey = msg.fields.routingKey;

          try {
            const payload = JSON.parse(msg.content.toString());
            console.log(`[Consumer] ${routingKey}:`, payload);

            // тут твоя бізнес-логіка
            await fs.appendFile(
                `logs/messages-${new Date().toISOString().split("T")[0]}.json`,
                JSON.stringify({ routingKey, payload, ts: new Date().toISOString() }) + "\n"
            );

            channel!.ack(msg);
          } catch (err) {
            await logError(err);
            channel!.nack(msg, false, false);
          }
        },
        { noAck: false }
    );
  } catch (err) {
    await logError(err);
    if (conn) await conn.close().catch(() => {});
    setTimeout(startConsumer, 5000); // reconnect
  }

  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    if (channel) await channel.close().catch(() => {});
    if (conn) await conn.close().catch(() => {});
    process.exit(0);
  });
}

startConsumer();