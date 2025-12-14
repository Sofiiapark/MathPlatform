// backend/src/achievement/src/index.ts

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3003;
const serviceName = process.env.SERVICE_NAME || 'UnknownService';

app.use(express.json());

// 🅰️ СИНХРОННИЙ: Перевірка досягнень (HTTP POST)
app.post('/api/achievement/check', (req, res) => {
    const { userId, moduleId } = req.body;
    // Імітація роботи...
    console.log(`[${serviceName}] Checked achievements for ${userId}. Found no new badge.`);
    // HTTP інструментація автоматично завершить Span
    res.status(200).send({ status: 'Achievements checked.' });
});

app.listen(PORT, () => {
    console.log(`[${serviceName}] listening on port ${PORT}`);
});