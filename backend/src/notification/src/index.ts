// backend/src/notification/src/index.ts

import express from 'express';
import * as amqp from 'amqplib';
import { propagation, context } from '@opentelemetry/api';

const app = express();
const PORT = process.env.PORT || 3004;
const serviceName = process.env.SERVICE_NAME || 'UnknownService';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'notification.module_completed'; 
const EXCHANGE_NAME = "math_platform_exchange";

app.use(express.json());

// ----------------------------------------------------
// 🅰️ СИНХРОННИЙ: Надсилання повідомлення (HTTP POST)
// ----------------------------------------------------
app.post('/api/notification/send', (req, res) => {
    const { userId, moduleId } = req.body;
    // Імітація роботи...
    console.log(`[${serviceName}] (Sync) Sent notification to ${userId} about completion of ${moduleId}.`);
    res.status(202).send({ status: 'Notification sent synchronously.' });
});


// ----------------------------------------------------
// 🅱️ АСИНХРОННИЙ: Споживач RabbitMQ
// ----------------------------------------------------
async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'module.completed');
        
        console.log(`[${serviceName}] Waiting for messages in ${QUEUE_NAME}.`);

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg) {
                // 1. Екстракція Trace Context із заголовків
                const headers = msg.properties.headers;
                const parentContext = propagation.extract(context.active(), headers);

                // 2. Логіка: OTel instrumentation автоматично створює новий Span
                // у контексті `parentContext` (Span `rabbitmq consume`)
                
                const message = JSON.parse(msg.content.toString());
                
                console.log(`[${serviceName}] (Async) Received event module.completed for user ${message.userId}.`);
                
                // ... тут можна додати логіку затримки для тестування EDA latency
                
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error(`[${serviceName}] RabbitMQ Consumer failed:`, error);
    }
}


app.listen(PORT, () => {
    console.log(`[${serviceName}] listening on port ${PORT}`);
    startConsumer(); // Запускаємо споживача RabbitMQ
});