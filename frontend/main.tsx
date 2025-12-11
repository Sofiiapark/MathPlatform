import React from "react";
import ReactDOM from "react-dom/client";
import 'tsconfig-paths/register';
import App from "./src/App"; // Імпортуємо ваш компонент App

// 1. Знаходимо кореневий елемент (який повинен бути у index.html)
const rootElement = document.getElementById("root");

if (rootElement) {
  // 2. Створюємо корінь React
  ReactDOM.createRoot(rootElement).render(
    // 3. Рендеримо ваш компонент у цьому корені
    <React.StrictMode>
      <App /> 
    </React.StrictMode>
  );
} else {
  // На випадок, якщо HTML-елемент не знайдено
  console.error("The element with ID 'root' was not found in the document.");
}