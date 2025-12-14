// shared/rabbit.ts
import * as amqp from "amqplib";
import {
  context,
  propagation,
  Span,
  trace,
  TextMapPropagator,
  TextMapSetter,
} from "@opentelemetry/api";

import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { PlatformEvent } from "./types";

const propagator: TextMapPropagator = new W3CTraceContextPropagator();
const headerSetter: TextMapSetter<Record<string, any>> = {
  set(carrier, key, value) {
    carrier[key] = value;
  },
};


export async function connectRabbit() {
  // Для Docker композиту: amqp://admin:admin@rabbitmq:5672
  // Для локального запуску: amqp://admin:admin@localhost:5672
  // Автоматично визначаємо, що використовувати
  let RABBITMQ_URL = process.env.RABBITMQ_URL;
  
  if (!RABBITMQ_URL) {
    // Якщо запущено в контейнері Docker
    if (process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true') {
      RABBITMQ_URL = "amqp://admin:admin@rabbitmq:5672";
    } else {
      RABBITMQ_URL = "amqp://admin:admin@localhost:5672";
    }
  }
  
  console.log(`[connectRabbit] Connecting to: ${RABBITMQ_URL}`);
  console.log(`[connectRabbit] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[connectRabbit] DOCKER: ${process.env.DOCKER}`);
  
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    console.log("[connectRabbit] Connected to RabbitMQ!");
    const channel = await connection.createChannel();
    console.log("[connectRabbit] Channel created!");
    return { connection, channel };
  } catch (error: any) {
    console.error(`[connectRabbit] Failed to connect to ${RABBITMQ_URL}:`, error.message);
    
    // Спроба альтернативного URL
    if (RABBITMQ_URL.includes("rabbitmq")) {
      const altUrl = RABBITMQ_URL.replace("rabbitmq", "localhost");
      console.log(`[connectRabbit] Trying alternative: ${altUrl}`);
      try {
        const connection = await amqp.connect(altUrl);
        const channel = await connection.createChannel();
        return { connection, channel };
      } catch (altError: any) {
        console.error(`[connectRabbit] Alternative also failed:`, altError.message);
      }
    } else if (RABBITMQ_URL.includes("localhost")) {
      const altUrl = RABBITMQ_URL.replace("localhost", "rabbitmq");
      console.log(`[connectRabbit] Trying alternative: ${altUrl}`);
      try {
        const connection = await amqp.connect(altUrl);
        const channel = await connection.createChannel();
        return { connection, channel };
      } catch (altError: any) {
        console.error(`[connectRabbit] Alternative also failed:`, altError.message);
      }
    }
    
    throw error;
  }
}

export async function publishEvent(
    channel: amqp.Channel, 
    exchange: string, 
    routingKey: string, 
    event: Omit<PlatformEvent, 'timestamp'> & { clientID?: string | null }, 
    span?: Span | null
) {
    // 1. Створюємо об'єкт для RabbitMQ заголовків
    const headers: Record<string, any> = {};

    // 2. Інжектуємо контекст трасування
    const contextToInject = span ? trace.setSpan(context.active(), span) : context.active();
    propagator.inject(contextToInject, headers, headerSetter);

    // 3. Формуємо повне повідомлення (додаємо timestamp)
    const fullMessage: PlatformEvent = {
        ...event,
        timestamp: new Date().toISOString(), // Додаємо timestamp тут
    };
    
    // 4. Публікуємо повідомлення
    channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(fullMessage)),
        { 
            persistent: true,
            headers: headers // Додаємо заголовки OTel
        } 
    );
    
    // 5. Додаємо подію трасування
    if (span) {
        span.addEvent('Event Published to RabbitMQ', {
            'event.exchange': exchange,
            'event.routing_key': routingKey,
            'event.component': event.component,
            'event.action': event.action,
        });
    }
}