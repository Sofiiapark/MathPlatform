//import { connectRabbit } from "@shared/rabbit";
import { connectRabbit } from "../../shared/rabbit";
import * as dotenv from "dotenv";

// Завантажити змінні середовища з .env файлу
dotenv.config();

const EXCHANGE = "math_platform_exchange";
const TOPIC_TO_LISTEN = "ai.ask.#";        // слухаємо всі ai.ask.<clientID>
const TOPIC_TO_PUBLISH_BASE = "ai.answer"; // відповідь буде ai.answer.<clientID>

(async () => {
    console.log("[AI-Service] Starting...");
    try {
        const { channel, connection } = await connectRabbit();

        connection.on("error", (err) =>
            console.error("[AI-Service] AMQP Connection Error:", err)
        );
        connection.on("close", () =>
            console.log("[AI-Service] Connection closed. Exiting...")
        );

        console.log("[AI-Service] Connected to RabbitMQ");

        // Створюємо Exchange
        await channel.assertExchange(EXCHANGE, "topic", { durable: true });

        // Створюємо постійну чергу для AI-сервісу
        const q = await channel.assertQueue("ai_service_queue", { durable: true });
        await channel.bindQueue(q.queue, EXCHANGE, TOPIC_TO_LISTEN);

        console.log(`[AI-Service] Listening on: ${TOPIC_TO_LISTEN}`);

        // Обробка повідомлень
        channel.consume(q.queue, async (msg) => {
            if (!msg) return;

            const routingKey = msg.fields.routingKey;

            try {
                const incoming = JSON.parse(msg.content.toString());
                const question = incoming.payload?.question;
                const clientID = incoming.payload?.clientID;

                if (!clientID) {
                    console.error("[AI-Service] Missing clientID. Dropping message.");
                    channel.nack(msg, false, false);
                    return;
                }

                console.log(`[AI-Service] Received (${routingKey}): "${question}" from client ${clientID}`);

                // --- AI ОБРОБКА ---
                const answer = "42"; // або await realAI(question)
                // ------------------

                // Публікуємо відповідь
                channel.publish(
                    EXCHANGE,
                    `${TOPIC_TO_PUBLISH_BASE}.${clientID}`,
                    Buffer.from(
                        JSON.stringify({
                            component: "ai",
                            action: "answer",
                            payload: answer,
                            clientID,
                            timestamp: new Date().toISOString(),
                        })
                    ),
                    { persistent: true }
                );

                channel.ack(msg);

                console.log(`[AI-Service] Responded to ai.answer.${clientID} → ${answer}`);
            } catch (err) {
                console.error("[AI-Service] Error:", err);
                channel.nack(msg, false, false); // не повертати в чергу
            }
        }, { noAck: false });

        console.log("[AI-Service] Consumer set up. Waiting for messages...");
    } catch (err) {
        console.error("[AI-Service] Fatal error:", err);
    }
})();
