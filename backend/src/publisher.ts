import * as amqp from "amqplib";
import readline from "readline";

const exchange = "math_platform_exchange";
const amqpUrl = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";

let channel: amqp.Channel;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const scenarios = [
  { key: "student.takeTest.student", text: "Пройти тест" },
  { key: "student.joinGame.student", text: "Долучитись до гри" },
  { key: "teacher.createTest.teacher", text: "Створити тест" },
  { key: "admin.launchGame.admin", text: "Запустити гру" },
  { key: "ai.ask.student", text: "Запит до ШІ" },
];

async function initAmqp() {
  const connection = await amqp.connect(amqpUrl);
  channel = await connection.createChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });

  process.on("SIGINT", async () => {
    await channel.close();
    await connection.close();
    rl.close();
    console.log("\n🔒 З’єднання закрите");
    process.exit(0);
  });

  console.log("✅ Підключено до RabbitMQ");
}

async function publishMessage(routingKey: string, text: string) {
  const payload = { text, timestamp: new Date().toISOString() };
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)));
  console.log(`➡️ Відправлено "${text}" → ${routingKey}`);
}

function showMenu() {
  console.log("\nМеню:");
  scenarios.forEach((s, i) => console.log(`${i + 1}. ${s.text}`));
  console.log(`${scenarios.length + 1}. Вихід`);

  rl.question("Ваш вибір: ", async (numStr) => {
    const num = parseInt(numStr);
    if (num === scenarios.length + 1) {
      rl.close();
      process.exit(0);
    }
    const scenario = scenarios[num - 1];
    if (scenario) await publishMessage(scenario.key, scenario.text);
    showMenu();
  });
}

(async () => {
  await initAmqp();
  showMenu();
})();