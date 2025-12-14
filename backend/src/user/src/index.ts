import express from 'express';
import cors from 'cors'; // 👈 ДОДАНО: Імпорт CORS
import { connectRabbitMQ, publishModuleCompleted } from '../src/rabbitmq-connector'; 
import { completeModuleSync } from '../src/sync-logic'; 
import { Tracer, trace, SpanStatusCode } from '@opentelemetry/api';

const app = express();
const PORT = 3001;
// Використовуйте ім'я сервісу з docker-compose
const serviceName = process.env.SERVICE_NAME || 'user-module-service'; 

// Приклад ініціалізації RabbitMQ (якщо потрібне асинхронне трасування)
let rabbitChannel: any; 

// Використовуємо глобальний трасувальник для ручного створення спанів
// Важливо: Отримуємо Tracer тут
const tracer: Tracer = trace.getTracer(serviceName); 

// ----------------------------------------------------
// ❗️ ВИПРАВЛЕННЯ: ДОДАВАННЯ CORS
// ----------------------------------------------------
// Дозволяємо запити з будь-якого джерела (для тестування, можна уточнити)
app.use(cors()); 

app.use(express.json());

// ----------------------------------------------------
// 🅰️ ЕНДПОІНТ: СИНХРОННИЙ ПІДХІД (REST/HTTP)
// ----------------------------------------------------
app.post('/api/module/complete-sync/:moduleId', async (req, res) => {
    const { userId } = req.body;
    const moduleId = req.params.moduleId;

    // Створюємо спан для синхронної обробки
    // Використовуємо context.active() для автоматичного встановлення батьківського спану від Express
    const parentSpan = tracer.startSpan('ModuleCompletion.SyncHandler');
    
    try {
        // Обов'язково встановлюємо атрибути для трасування
        parentSpan.setAttribute('user.id', userId);
        parentSpan.setAttribute('module.id', moduleId);

        await completeModuleSync(userId, moduleId, parentSpan); 
        res.status(200).send({ message: 'Module completed and all subsequent steps processed synchronously.' });
    } catch (error: any) {
        parentSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message }); // Використовуємо SpanStatusCode
        console.error(`[${serviceName}] Sync error:`, error.message);
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
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'RabbitMQ connection not established.' });
        span.end();
        return res.status(503).send({ message: 'Service not ready (RabbitMQ).', error: 'Service Unavailable' });
    }

    try {
        span.setAttribute('user.id', userId);
        span.setAttribute('module.id', moduleId);
        
        const eventPayload = { userId, moduleId };
        await publishModuleCompleted(rabbitChannel, eventPayload, span); // Публікує подію в RabbitMQ
        
        // Клієнту повертаємо швидку відповідь (низька затримка!)
        res.status(202).send({ 
            message: 'Module completion event published. Processing continues asynchronously.', 
            status: 'ACCEPTED' 
        });
    } catch (error: any) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        console.error(`[${serviceName}] Async publish error:`, error.message);
        res.status(500).send({ message: 'Failed to publish event.', error: error.message });
    } finally {
        span.end();
    }
});


// Запуск
async function startServer() {
    try {
        // ❗️ Виклик connectRabbitMQ має бути перед listen
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