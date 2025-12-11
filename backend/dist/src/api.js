"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const amqplib_1 = __importDefault(require("amqplib"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
async function sendEvent(route, payload) {
    const conn = await amqplib_1.default.connect('amqp://rabbitmq');
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
//# sourceMappingURL=api.js.map