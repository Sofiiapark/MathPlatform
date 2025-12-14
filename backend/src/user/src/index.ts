import express from 'express';
import { connectRabbitMQ, publishModuleCompleted } from './rabbitmq-connector'; // Буде реалізовано пізніше
import { completeModuleSync } from './sync-logic'; // Буде реалізовано пізніше
import { Tracer } from '@opentelemetry/api';

const app = express();
const PORT = 3001;
const serviceName = process.env.SERVICE_NAME || 'UnknownService';

// Приклад ініціалізації RabbitMQ (якщо потрібне асинхронне трасування)
let rabbitChannel: any; 

// Використовуємо глобальний трасувальник для ручного створення спанів
const tracer: Tracer = require('@opentelemetry/api').trace.getTracer(serviceName);

app.use(express.json());

// ----------------------------------------------------
// 🅰️ ЕНДПОІНТ: СИНХРОННИЙ ПІДХІД (REST/HTTP)
// ----------------------------------------------------
app.post('/api/module/complete-sync/:moduleId', async (req, res) => {
    const { userId } = req.body;
    const moduleId = req.params.moduleId;

    // Створюємо спан для синхронної обробки
    const parentSpan = tracer.startSpan('ModuleCompletion.SyncHandler');
    
    try {
        await completeModuleSync(userId, moduleId, parentSpan); // Викликає Progress, Achievement, Notification через HTTP
        res.status(200).send({ message: 'Module completed and all subsequent steps processed synchronously.' });
    } catch (error: any) {
        parentSpan.setStatus({ code: 2, message: error.message }); // 2: StatusCode.ERROR
        res.status(500).send({ message: 'Sync process failed at one of the steps.', error: error.message });
    } finally {
        parentSpan.end();
    }
});

// ----------------------------------------------------
// 🅱️ ЕНДПОІНТ: АСИНХРОННИЙ ПІДХІД (EDA/RabbitMQ)
// ----------------------------------------------------
app.post('/api/module/complete-async/:moduleId', async (req, res) => {
    const { userId } = req.body;
    const moduleId = req.params.moduleId;

    // Створюємо спан для асинхронної обробки
    const span = tracer.startSpan('ModuleCompletion.AsyncHandler');
    
    if (!rabbitChannel) {
        span.setStatus({ code: 2, message: 'RabbitMQ connection not established.' });
        span.end();
        return res.status(503).send({ message: 'Service not ready.' });
    }

    try {
        const eventPayload = { userId, moduleId };
        await publishModuleCompleted(rabbitChannel, eventPayload, span); // Публікує подію в RabbitMQ
        
        // Клієнту повертаємо швидку відповідь (низька затримка!)
        res.status(202).send({ 
            message: 'Module completion event published. Processing continues asynchronously.', 
            status: 'ACCEPTED' 
        });
    } catch (error: any) {
        span.setStatus({ code: 2, message: error.message });
        res.status(500).send({ message: 'Failed to publish event.', error: error.message });
    } finally {
        span.end();
    }
});


// Запуск
async function startServer() {
    try {
        rabbitChannel = await connectRabbitMQ();
        app.listen(PORT, () => {
            console.log(`[${serviceName}] listening on port ${PORT}`);
        });
    } catch (error) {
        console.error(`[${serviceName}] Startup failed:`, error);
        process.exit(1);
    }
}

startServer();