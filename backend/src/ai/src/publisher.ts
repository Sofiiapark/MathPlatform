/*import express from 'express';
import amqp from 'amqplib';
import { WebSocketServer, WebSocket } from 'ws'; // Імпортуємо ws
import * as http from 'http';

const EXCHANGE = 'math_platform_exchange'; // Використовуйте назву вашої біржі
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const PORT = 3000;

const app = express();
app.use(express.json());

// Створюємо HTTP-сервер, щоб передати його WebSocket-серверу
const server = http.createServer(app); 
const wss = new WebSocketServer({ server });

// Зберігатимемо WebSocket-з'єднання клієнтів за їхнім ID (або іншим ідентифікатором)
const clients: Map<string, WebSocket> = new Map();

// --- RABBITMQ CONNECT & PUBLISH (Винесено для чистоти) ---

let rabbitChannel: amqp.Channel | null = null;

async function setupRabbitMQ() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        rabbitChannel = await conn.createChannel();
        await rabbitChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
        
        console.log("RabbitMQ connected in API service.");
        
        // 1. НАЛАШТУВАННЯ CONSUМER'А В СЕРЕДИНІ PUBLISHER'А
        await setupResponseConsumer(rabbitChannel);

    } catch (error) {
        console.error("Failed to connect to RabbitMQ in API service:", error);
        // Обробка фатальної помилки
        process.exit(1); 
    }
}

async function sendEvent(route: string, payload: any) {
    if (!rabbitChannel) {
        console.error("RabbitMQ channel is not ready.");
        return;
    }
    // Додаємо ID клієнта для зворотного зв'язку!
    const fullPayload = { ...payload, timestamp: new Date().toISOString() };
    
    rabbitChannel.publish(EXCHANGE, route, Buffer.from(JSON.stringify(fullPayload)));
}


// --- 2. ФУНКЦІЯ ПРИЙМАННЯ ВІДПОВІДЕЙ З RABBITMQ ---

async function setupResponseConsumer(channel: amqp.Channel) {
    // Слухаємо подію, яку публікує AI-сервіс
    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, EXCHANGE, 'ai.answer.*'); // Слухаємо відповіді AI
    
    channel.consume(q.queue, (msg) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());
            
            // Якщо повідомлення містить clientID, ми знаємо, кому відповідати
            const clientId = payload.clientID; 
            const answer = payload.payload; // Припустимо, що payload.payload містить "42"
            
            if (clientId && clients.has(clientId)) {
                const clientSocket = clients.get(clientId);
                
                // Надсилаємо відповідь клієнту через WebSocket
                clientSocket?.send(JSON.stringify({
                    type: 'ai_response',
                    answer: answer,
                    status: 'completed'
                }));
                console.log(`[WS] Sent answer to client ${clientId}: ${answer}`);
                
            } else {
                console.warn(`[WS] Client ${clientId} not found or no clientID in message.`);
            }
            channel.ack(msg);
        } catch (error) {
            console.error("[API Consumer] Error processing AI response:", error);
            channel.nack(msg);
        }
    });
}

// --- 3. НАЛАШТУВАННЯ WEBSOCKETS ---

// При кожному новому з'єднанні клієнта
wss.on('connection', (ws: WebSocket, req) => {
    // У реальному житті clientID потрібно отримувати з токена або сесії
    // Тут ми використовуємо простий унікальний ID
    const clientId = Math.random().toString(36).substring(2, 9); 
    clients.set(clientId, ws);
    
    console.log(`[WS] Client connected: ${clientId}`);
    
    // Надсилаємо clientID назад клієнту, щоб він міг його використати
    ws.send(JSON.stringify({ type: 'connected', clientID: clientId }));

    ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`);
        clients.delete(clientId);
    });
    
    ws.on('error', (error) => {
        console.error(`[WS] Error on socket ${clientId}:`, error);
    });
});


// --- 4. HTTP-МАРШРУТИ (ОНОВЛЕННЯ) ---

app.post('/api/ai', async (req, res) => {
    // Нам потрібно отримати clientID, який фронтенд має передати
    const { question, clientID } = req.body; 
    
    if (!clientID) {
        return res.status(400).send({ ok: false, error: "clientID is required for tracking." });
    }

    // Публікуємо ai.ask. Тепер AI-сервіс знає, який клієнт очікує відповідь.
    await sendEvent('ai.ask', { question, clientID }); 
    
    // Відповідаємо клієнту, що запит прийнято (але відповіді ще немає)
    return res.send({ ok: true, message: "Request accepted, waiting for AI response..." });
});

// Запуск
setupRabbitMQ().then(() => {
    server.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
});*/