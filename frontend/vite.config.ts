import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // ОНОВЛЕНИЙ БЛОК 'define'
    define: {
        // @ts-ignore
        'process': {
            env: {},
            argv: [],
            platform: 'browser',
            /*// !!! НОВИЙ ФІКС: Додаємо функцію cwd, яка повертає порожній рядок*/
            cwd: () => '',
        },
        'process.env': {}
    },

    // Залишаємо проксі для API, якщо він ще потрібен
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path,
                //rewrite: (path) => path.replace(/^\/api/, '/api'),
            },
        },
    },
})