import React, { useState, useEffect, useRef } from "react";

// Конфігурація URL
const HOSTNAME = window.location.hostname;
const GATEWAY_URL = `http://${HOSTNAME}:3000`; // API Gateway (Порт 3000)
const MODULE_SERVICE_URL = `http://${HOSTNAME}:3001`; // Module-Service (Порт 3001)
const WS_URL = `ws://${HOSTNAME}:3000`; // WebSocket

export default function App() {
    console.log("App component mounted!");

    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState("Очікування відповіді...");
    const [moduleStatus, setModuleStatus] = useState("Очікування тестування модуля..."); // НОВИЙ СТЕЙТ
    const [clientID, setClientID] = useState<string | null>(null);

    const ws = useRef<WebSocket | null>(null);

    // --- WebSocket підключення ---
    useEffect(() => {
        if (ws.current) return;

        const socket = new WebSocket(WS_URL);
        ws.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connected");
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // 1. Отримання clientID
                if (message.type === "connected") {
                    setClientID(message.clientID);
                    setResponse("Підключено до WebSocket. ClientID отримано.");
                    return;
                }

                // 2. Відповідь AI
                if (message.component === "ai" && message.action === "answer") {
                    const payload =
                        typeof message.payload === "string"
                            ? message.payload
                            : JSON.stringify(message.payload);

                    setResponse(`AI: ${payload}`);
                    return;
                }

                // 3. Подія тесту
                if (message.component === "quiz" && message.action === "testCompleted") {
                    setResponse(`Тест завершено! Результат: ${message.payload.score}`);
                    return;
                }
            } catch (e) {
                console.error("Помилка парсингу WS:", e);
            }
        };

        socket.onclose = () => {
            console.log("WebSocket disconnected");
        };

        return () => {
            socket.close();
            ws.current = null;
        };
    }, []);

    // --- Виклик API Gateway (Порт 3000) ---
    async function api(method: string, body: any) {
        if (!clientID && ["ai", "takeTest"].includes(method)) {
            alert("ClientID не отримано. Зачекайте WebSocket.");
            return;
        }

        const payloadWithID = { ...body, clientID };

        if (method === "ai") {
            setResponse("Запит відправлено. Очікування відповіді від AI...");
        }

        try {
            const res = await fetch(`${GATEWAY_URL}/api/${method}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadWithID),
            });

            const result = await res.json();
            console.log("HTTP response:", result);

            if (!["ai", "takeTest"].includes(method)) {
                setResponse(`Операція '${method}' завершена: ${result.ok}`);
            }
        } catch (e) {
            console.error("API error:", e);
            setResponse("Помилка API.");
        }
    }
    
    // --- Виклик Module Service (Порт 3001) ---
    async function callModuleService(endpoint: 'complete-sync' | 'complete-async') {
        setModuleStatus(`Відправлення ${endpoint.toUpperCase()}...`);
        const moduleId = 'mod-123';
        // Використовуємо реальний ClientID, якщо доступний, або фіктивний для тестування
        const userId = clientID || 'anonymous-test-user-sync'; 

        try {
            // Виклик безпосередньо сервісу user-module-service
            const res = await fetch(`${MODULE_SERVICE_URL}/api/module/${endpoint}/${moduleId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            const result = await res.json();
            console.log(`Module Service (${endpoint}) response:`, res.status, result);

            let statusMessage = `${endpoint.toUpperCase()} завершено. Статус HTTP: ${res.status}. `;

            if (endpoint === 'complete-sync') {
                statusMessage += res.ok ? 'Усі кроки виконані СИНХРОННО (Перевірте Jaeger на довгий Trace).' : 'ПОМИЛКА в синхронному ланцюжку.';
            } else {
                statusMessage += res.ok ? 'Подія опублікована АСИНХРОННО (Перевірте Jaeger на два Trace).' : 'ПОМИЛКА публікації події.';
            }

            setModuleStatus(statusMessage);

        } catch (e) {
            console.error("Module Service error:", e);
            setModuleStatus(`Помилка підключення до Module Service (Порт 3001).`);
        }
    }


    return (
        <div style={{ padding: "20px" }}>
            <h2>Math Platform Тестування</h2>

            <p><b>API Gateway (3000) Status:</b> {response}</p>
            <p>
                <b>Ваш Client ID:</b> {clientID ? clientID : "Очікування WebSocket…"}
            </p>

            <hr />

            <h3>Тестування існуючих функцій (API Gateway)</h3>
            <button onClick={() => api("register", { user: "testUser" })}>
                Register (EDA/Async)
            </button>

            <button onClick={() => api("takeTest", { testId: 1 })}>
                Take Test (EDA/Async + WS)
            </button>

            <br /><br />

            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask AI..."
                style={{ width: "300px" }}
            />

            <button onClick={() => api("ai", { question })}>
                Ask AI (EDA/Async + WS)
            </button>

            <hr />

            <h3>Тестування Module Completion (Module Service - Порт 3001)</h3>
            <p><b>Module Status:</b> {moduleStatus}</p>

            {/* 🅰️ Варіант А: Класична Синхронна Модель (REST/HTTP) */}
            <button 
                onClick={() => callModuleService('complete-sync')}
                style={{ backgroundColor: '#ffaaaa', marginRight: '10px' }}
            >
                Тест A: Sync Completion (Висока Latency)
            </button>

            {/* 🅱️ Варіант Б: Подієво-Орієнтована Модель (RabbitMQ/EDA) */}
            <button 
                onClick={() => callModuleService('complete-async')}
                style={{ backgroundColor: '#aaffaa' }}
            >
                Тест B: Async Completion (Низька Latency)
            </button>
        </div>
    );
}