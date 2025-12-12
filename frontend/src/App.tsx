import React, { useState, useEffect, useRef } from "react";

const WS_URL = `ws://${window.location.hostname}:3000`; // Універсальний варіант

export default function App() {
    console.log("App component mounted!");

    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState("Очікування відповіді...");
    const [clientID, setClientID] = useState<string | null>(null);

    const ws = useRef<WebSocket | null>(null);

    // --- WebSocket підключення ---
    useEffect(() => {
        if (ws.current) return; // запобігання дублювання

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
                    console.log("ClientID:", message.clientID);
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
            // ❗ clientID НЕ очищаємо, щоб не губити асоціацію
        };

        return () => {
            socket.close();
            ws.current = null;
        };
    }, []);

    // --- Виклик API ---
    async function api(method: string, body: any) {
        // ❗ Правильна перевірка clientID
        if (!clientID && ["ai", "takeTest"].includes(method)) {
            alert("ClientID не отримано. Зачекайте WebSocket.");
            return;
        }

        const payloadWithID = { ...body, clientID };

        if (method === "ai") {
            setResponse("Запит відправлено. Очікування відповіді від AI...");
        }

        try {
            const res = await fetch(`http://${window.location.hostname}:3000/api/${method}`, {
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

    return (
        <div style={{ padding: "20px" }}>
            <h2>Math Platform</h2>

            <p><b>Статус:</b> {response}</p>
            <p>
                <b>Ваш Client ID:</b> {clientID ? clientID : "Очікування WebSocket…"}
            </p>

            <hr />

            <button onClick={() => api("register", { user: "testUser" })}>
                Register (Синхронно)
            </button>

            <button onClick={() => api("takeTest", { testId: 1 })}>
                Take Test (Асинхронно)
            </button>

            <br /><br />

            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask AI..."
                style={{ width: "300px" }}
            />

            <button onClick={() => api("ai", { question })}>
                Ask AI (Асинхронно)
            </button>
        </div>
    );
}
