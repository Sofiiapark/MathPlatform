import express from 'express';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

async function sendEvent(route: string, payload: any) {
    try {
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await conn.createChannel();
        await channel.assertExchange('math', 'topic', { durable: false });
        channel.publish('math', route, Buffer.from(JSON.stringify(payload)));
        await channel.close();
        await conn.close();
    } catch (err) {
        console.error("AMQP error:", err);
    }
}

app.post('/api/register', async (req, res) => {
    await sendEvent('auth.register', { user: req.body.user });
    res.json({ ok: true });
});

app.post('/api/takeTest', async (req, res) => {
    await sendEvent('quiz.takeTest', { testId: req.body.testId });
    res.json({ ok: true });
});

app.post('/api/ai', async (req, res) => {
    await sendEvent('ai.ask', { question: req.body.question });
    res.json({ ok: true });
});

// Catch-all для невідомих маршрутів (ставимо в кінці!)
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.listen(3000, () => console.log("✅ API running at http://localhost:3000"));