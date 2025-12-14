#!/bin/bash

echo "🔹 Тест /api/register"
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"user":"test"}'
echo -e "\n"

echo "🔹 Тест /api/takeTest"
curl -X POST http://localhost:3000/api/takeTest \
  -H "Content-Type: application/json" \
  -d '{"testId":1}'
echo -e "\n"

echo "🔹 Тест /api/ai"
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"question":"Що таке інтеграл?"}'
echo -e "\n"