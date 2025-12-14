import express from "express";
import * as amqp from "amqplib";

const app = express();
app.use(express.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const EXCHANGE_NAME = "math_platform_exchange";

async function sendEvent(route: string, payload: any) {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    channel.publish(EXCHANGE_NAME, route, Buffer.from(JSON.stringify(payload)));
    await channel.close();
    await conn.close();
}

app.get("/", (req, res) => {
    res.send("✅ Math Platform API працює");
});

app.post("/api/register", async (req, res) => {
    await sendEvent("user.register.student", { user: req.body.user || "default_user" });
    res.json({ ok: true });
});

app.post("/api/takeTest", async (req, res) => {
    await sendEvent("student.takeTest.student", { testId: req.body.testId || "demo_test" });
    res.json({ ok: true });
});

app.post("/api/ai", async (req, res) => {
    await sendEvent("ai.ask.student", { question: req.body.question || "Що таке інтеграл?" });
    res.json({ ok: true });
});

app.listen(3000, () => console.log("🚀 API працює на http://localhost:3000"));