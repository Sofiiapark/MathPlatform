import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // КРИТИЧНИЙ ФІКС 1: Вирішує помилку "process is not defined"
    // (process.argv та process.env)
    define: {
        'process': {
            env: {},
            argv: [], // Імітуємо масив для process.argv.slice(2)
            platform: 'browser'
        },
        'process.env': {}
    },

    // КРИТИЧНИЙ ФІКС 2: Налаштування проксі для викликів API
    // Перенаправляє запити з 8080/api на бекенд (3000)
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api'),
            },
        },
    },
})