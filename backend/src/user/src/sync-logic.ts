// backend/src/user/src/sync-logic.ts

import axios from 'axios';
import { Span } from '@opentelemetry/api';

// Використання імен сервісів (контейнерів) для викликів
const PROGRESS_URL = 'http://progress:3002/api/progress/update';
const ACHIEVEMENT_URL = 'http://achievement:3003/api/achievement/check';
const NOTIFICATION_URL = 'http://notification:3004/api/notification/send';

// Затримка для імітації роботи сервісу (допомагає побачити затримки в Jaeger)
const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function completeModuleSync(userId: string, moduleId: string, parentSpan: Span) {
    const payload = { userId, moduleId };

    console.log(`[Sync] Starting process for user ${userId}...`);
    
    // 1. Module-Service -> Progress-Service (HTTP PATCH)
    // Span створюється автоматично завдяки @opentelemetry/instrumentation-http
    await simulateDelay(50); 
    console.log('[Sync] Calling Progress-Service...');
    await axios.patch(PROGRESS_URL, payload);

    // 2. Progress-Service -> Achievement-Service (HTTP POST)
    await simulateDelay(50); 
    console.log('[Sync] Calling Achievement-Service...');
    await axios.post(ACHIEVEMENT_URL, payload);

    // 3. Achievement-Service -> Notification-Service (HTTP POST)
    await simulateDelay(50); 
    console.log('[Sync] Calling Notification-Service...');
    await axios.post(NOTIFICATION_URL, payload);
    
    console.log(`[Sync] All HTTP steps completed.`);
}