import express from 'express';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

async function sendEvent(route: string, payload: any) {
    // Зміни рядок підключення на цей:
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq');
    const channel = await conn.createChannel();
    await channel.assertExchange('math', 'topic', { durable: false });

    await channel.publish('math', route, Buffer.from(JSON.stringify(payload)));
}

app.post('/api/register', async (req, res) => {
    await sendEvent('auth.register', { user: req.body });
    res.send({ ok: true });
});

app.post('/api/takeTest', async (req, res) => {
    await sendEvent('quiz.takeTest', { testId: req.body.testId });
    res.send({ ok: true });
});

app.post('/api/ai', async (req, res) => {
    await sendEvent('ai.ask', { question: req.body.question });
    res.send({ ok: true });
});

app.listen(3000, () => console.log("API running at 3000"));
