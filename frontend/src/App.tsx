import React, { useState } from "react";

export default function App() {
    console.log("App component is running!");
  const [question, setQuestion] = useState("");

  async function api(method: string, body: any) {
    await fetch(`/api/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div>
      <h2>Math Platform</h2>

      <button onClick={() => api("register", { user: "test" })}>
        Register
      </button>

      <button onClick={() => api("takeTest", { testId: 1 })}>Take Test</button>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask AI"
      />

      <button onClick={() => api("ai", { question })}>Ask AI</button>
    </div>

  );
}
