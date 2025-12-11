import * as amqp from "amqplib";
import readline from "readline";
import fs from "fs/promises"; //асинхронна версію API файлової системи

const exchange = "math_platform_exchange";
const amqpUrl = "amqp://localhost";

let connection: amqp.ChannelModel;
let channel: amqp.Channel;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const scenarios = [
  { key: "student.takeTest.student", text: "Пройти тест" },
  { key: "student.joinGame.student", text: "Долучитись до гри" },
  { key: "student.schedule.student", text: "Побудувати/змінити графік" },
  { key: "ai.ask.student", text: "Задати запит ШІ" },
  {
    key: "teacher.addMaterials.teacher",
    text: "Додати навчальні матеріали (файли/модулі)",
  },
  { key: "teacher.createTest.teacher", text: "Створити тест" },
  {
    key: "teacher.viewStats.teacher",
    text: "Переглянути статистику студентів",
  },
  { key: "admin.launchGame.admin", text: "Запустити гру/змагання" },
  { key: "admin.viewStats.admin", text: "Переглянути аналітику платформи" },
  { key: "platform.update.system", text: "Оновлення або перезапуск платформи" },
  {
    key: "platform.broadcast.system",
    text: "Оповіщення користувачів про подію",
  },
];

// Ініціалізація з’єднання AMQP та каналу
async function initAmqp() {
  try {
    console.log(`Підключення до AMQP на ${amqpUrl}...`);

    connection = await amqp.connect(amqpUrl); // Створення з’єднання з RabbitMQ
    channel = await connection.createChannel();
    await channel.assertExchange(exchange, "topic", { durable: true }); // Створення обміну типу "topic"

    connection.on("error", (err) =>
      console.error("AMQP Connection Error:", err)
    );
    connection.on("close", () => console.log("З’єднання закрите"));

    console.log("З’єднання та канал встановлено.");
  } catch (err) {
    console.error("Не вдалося підключитися до AMQP:", err);
    process.exit(1);
  }
}

async function publishMessage(routingKey: string, text: string) {
  if (!channel) {
    console.error("Канал недоступний. Повідомлення не відправлено.");
    return;
  }

  const payload = { text, timestamp: new Date().toISOString() };
  const sent = channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload))
  ); // Відправка повідомлення з вказаним routing key

  if (sent) {
    console.log(`Відправлено "${text}" -> ${routingKey}`);
    await fs.appendFile(
      "publisher.log",
      `[${new Date().toISOString()}] ${routingKey}: ${text}\n`
    );
  } else {
    console.log(`Буфер каналу переповнений: "${text}" → ${routingKey}`);
  }
}

async function showMenu() {
  console.log("\n Навчальна платформа \n");
  scenarios.forEach((s, i) => console.log(`${i + 1}. ${s.text}`));
  console.log(`${scenarios.length + 1}. Вихід`);

  rl.question("\n Номер сценарію: ", async (numStr) => {
    const num = parseInt(numStr);
    if (isNaN(num) || num < 1 || num > scenarios.length + 1) {
      console.log("Невірний вибір, спробуйте ще раз.");
      return showMenu();
    }

    if (num === scenarios.length + 1) {
      console.log("Вихід");

      await connection.close();
      rl.close();
      console.log("З’єднання закрите.");
      return;
    }

    const scenario = scenarios[num - 1];
    if (!scenario) return showMenu();
    await publishMessage(scenario.key, scenario.text);
    showMenu();
  });
}

async function startPublisher() {
  await initAmqp();
  showMenu();
}

startPublisher();
