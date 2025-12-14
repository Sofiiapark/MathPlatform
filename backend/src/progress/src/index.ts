// backend/src/progress/src/index.ts

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3002;
const serviceName = process.env.SERVICE_NAME || 'UnknownService';

app.use(express.json());

// 🅰️ СИНХРОННИЙ: Оновлення прогресу (HTTP PATCH)
app.patch('/api/progress/update', (req, res) => {
    const { userId, moduleId } = req.body;
    // Імітація роботи...
    console.log(`[${serviceName}] Updated progress for ${userId} in module ${moduleId}.`);
    // HTTP інструментація автоматично завершить Span
    res.status(200).send({ status: 'Progress updated.' });
});

app.listen(PORT, () => {
    console.log(`[${serviceName}] listening on port ${PORT}`);
});