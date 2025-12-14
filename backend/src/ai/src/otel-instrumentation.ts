// otel-instrumentation.ts (ФІНАЛЬНА КОНФІГУРАЦІЯ, ЯКА МАЄ ПРАЦЮВАТИ)

import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'; 
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib'; 


const serviceName = process.env.SERVICE_NAME || 'UnknownService';

console.log(`[OTel SDK] Service Name set to: ${serviceName}`); 

// 1. Створення Експортера
const collectorExporter = new OTLPTraceExporter({
  url: `http://otel-collector:4318/v1/traces`, // OTLP/HTTP
});

// 2. Створення ОДНОГО Процесора
const spanProcessor = new BatchSpanProcessor(collectorExporter); 

const sdk = new NodeSDK({
  
  // **********************************
  // ВИПРАВЛЕННЯ: Встановлюємо ServiceName напряму!
  // **********************************
  serviceName: serviceName, // <-- Використовуємо старий, але надійний синтаксис
  
  spanProcessor: spanProcessor, // Вирішує помилку CompositeSpanProcessor
  
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new AmqplibInstrumentation({}),
  ],
});

sdk.start();