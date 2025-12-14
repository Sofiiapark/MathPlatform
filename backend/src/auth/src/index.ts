import { connectRabbit, publishEvent } from "../../shared/rabbit"; 
import { PlatformEvent } from "../../shared/types";
import { trace, SpanStatusCode } from "@opentelemetry/api"; 
import { connect } from "amqplib";

// ----------------------------------------------------
// 1. ІНІЦІАЛІЗАЦІЯ OTel (для цього скрипта)
// ----------------------------------------------------
const serviceName = 'auth-simulator';
const tracer = trace.getTracer(serviceName); 

(async () => {
    // 2. Створюємо батьківський Span для симуляції
    const span = tracer.startSpan('AuthSimulator.SendRegisterEvent');

    try {
        const { channel } = await connectRabbit();

        const EXCHANGE = "platform";
        await channel.assertExchange(EXCHANGE, "topic");

        // 3. Формуємо payload
        // Примітка: publishEvent сам додасть timestamp
        const eventToSend = {
            component: "auth",
            action: "register",
            payload: { email: "test@example.com" },
        };
        
        // 4. Публікуємо подію, використовуючи функцію з OTel Propagation
        await publishEvent(
            channel, 
            EXCHANGE, 
            "auth.register", 
            eventToSend, 
            span // ❗ Передаємо Span для інжекції Trace Context у заголовки
        );

        console.log("Auth sent register event");
        
    } catch (error: any) {
        console.error("Error during event simulation:", error.message);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } finally {
        span.end();
    }
})();