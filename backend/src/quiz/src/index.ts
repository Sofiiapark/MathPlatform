import { connectRabbit, publishEvent } from "../../shared/rabbit";
import { PlatformEvent } from "../../shared/types"; 
import {
  trace,
  context,
  propagation,
  TextMapGetter,
} from "@opentelemetry/api";

import { W3CTraceContextPropagator } from "@opentelemetry/core";

const EXCHANGE = "math_platform_exchange";

// OTel Propagator
const propagator = new W3CTraceContextPropagator(); 
const tracer = trace.getTracer('quiz-service');

const headerGetter: TextMapGetter<Record<string, any>> = {
  keys(carrier) {
    return Object.keys(carrier);
  },
  get(carrier, key) {
    const value = carrier[key];
    return Array.isArray(value) ? value : value?.toString();
  },
};

(async () => {
  console.log("[QUIZ START] Attempting to connect to RabbitMQ...");
    // Встановлення з'єднання з RabbitMQ
    const { channel } = await connectRabbit();

    // Створення обмінника для вхідних подій
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });

    // 1. Встановлення черги та прив'язка до вхідної події 'quiz.takeTest'
    const { queue } = await channel.assertQueue("quiz_test_processor", { durable: true });
    channel.bindQueue(queue, EXCHANGE, "quiz.takeTest"); 

    console.log("[QUIZ] Waiting for messages in queue 'quiz_test_processor'.");
    
    // 2. Споживання вхідних подій
    channel.consume(queue, async (msg) => {
        if (!msg) return;

        // --- OpenTelemetry: Екстракція та відновлення контексту ---
       const headers = msg.properties.headers || {};
        
        // ❗ ВИПРАВЛЕНО ТИПИ: Отримуємо повну PlatformEvent
        const incomingEvent: PlatformEvent = JSON.parse(msg.content.toString());
        const { testId, clientID } = incomingEvent.payload; 

        const remoteContext = propagator.extract(
            context.active(),
            headers,
            headerGetter
        );
        
        // Створюємо спан, який буде дочірнім до трасування API Gateway
        tracer.startActiveSpan('quiz.process_take_test', { attributes: { 'event.route': incomingEvent.action } }, remoteContext, async (span) => {
            
            try {
                
                // ----------------------------------------------------
                // 3. ІМІТАЦІЯ ОБРОБКИ ТЕСТУ
                // ----------------------------------------------------
                span.setAttribute('test.id', testId);
                span.setAttribute('user.client_id', clientID);
                console.log(`[QUIZ] Received test ${testId} for client: ${clientID}`);

                // Імітуємо затримку обробки
                await new Promise(resolve => setTimeout(resolve, 500)); 
                
                const score = Math.floor(Math.random() * 100);
                const result = { score, testId, clientID, message: `Completed with score ${score}` };
                
                // ----------------------------------------------------
                // 4. ВІДПРАВКА ВІДПОВІДІ 
                // ----------------------------------------------------
                
                // Опубліковуємо подію, використовуючи активний спан як контекст
                await publishEvent(
                    channel, 
                    EXCHANGE, 
                    "quiz.testCompleted", 
                    {
                        component: "quiz",
                        action: "testCompleted",
                        clientID: clientID, // Ключове поле для API Gateway
                        payload: result,
                    }, 
                    span
                );
                
                console.log(`[QUIZ] Published result: quiz.testCompleted -> ${clientID} (Score: ${score})`);

                channel.ack(msg);
                span.end(); // Закриваємо спан
            } catch (error: any) {
                console.error("[QUIZ] Error processing message:", error);
                channel.reject(msg, false); 
                span.setStatus({ code: 2, message: error.message });
                span.end();
            }
        });
    }, { noAck: false });
})();