import React, { useState } from "react";

export default function App() {
    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function api(method: string, body: any) {
        setLoading(true);
        setResponse(null);
        setError(null);

        try {
            const res = await fetch(`/api/${method}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const contentType = res.headers.get("content-type");
            if (!contentType?.includes("application/json")) {
                const text = await res.text();
                throw new Error(`Non-JSON response:\n${text}`);
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.message || `Error ${res.status}`);
            }

            setResponse(JSON.stringify(data));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>🧠 Math Platform</h2>

            <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => api("register", { user: "test" })}>
                    Register
                </button>
                <button style={styles.button} onClick={() => api("takeTest", { testId: 1 })}>
                    Take Test
                </button>
            </div>

            <div style={styles.inputRow}>
                <input
                    style={styles.input}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask AI something..."
                />
                <button style={styles.button} onClick={() => api("ai", { question })}>
                    Ask AI
                </button>
            </div>

            {loading && <p style={styles.loading}>⏳ Loading...</p>}
            {response && <p style={styles.success}>✅ Response: {response}</p>}
            {error && <p style={styles.error}>❌ Error: {error}</p>}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: "Arial, sans-serif",
        maxWidth: 600,
        margin: "40px auto",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
    },
    title: {
        textAlign: "center",
        marginBottom: 20,
    },
    buttonRow: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    inputRow: {
        display: "flex",
        gap: 10,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        padding: 8,
        fontSize: 16,
        borderRadius: 4,
        border: "1px solid #ccc",
    },
    button: {
        padding: "8px 16px",
        fontSize: 16,
        borderRadius: 4,
        border: "none",
        backgroundColor: "#007bff",
        color: "#fff",
        cursor: "pointer",
    },
    loading: {
        color: "#555",
    },
    success: {
        color: "green",
        whiteSpace: "pre-wrap",
    },
    error: {
        color: "red",
        whiteSpace: "pre-wrap",
    },
};