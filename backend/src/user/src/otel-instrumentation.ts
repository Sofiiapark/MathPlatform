import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const serviceName = process.env.SERVICE_NAME || 'UnknownService';
const collectorUrl = `http://otel-collector:4318/v1/traces`;

console.log(`[OTel SDK ${serviceName}] Service Name set to: ${serviceName}`); 
console.log(`[OTel SDK ${serviceName}] Collector URL: ${collectorUrl}`); 

const collectorExporter = new OTLPTraceExporter({
  url: collectorUrl, 
});

const spanProcessor = new BatchSpanProcessor(collectorExporter); 

const sdk = new NodeSDK({
  serviceName: serviceName, // <-- Надійний синтаксис
  spanProcessor: spanProcessor, 
  instrumentations: [
    getNodeAutoInstrumentations({
      // Додайте інструментації для HTTP-викликів та Express
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    // RabbitMQ Instrumentation буде потрібна для Асинхронного варіанту (якщо використовується)
  ],
});

sdk.start();