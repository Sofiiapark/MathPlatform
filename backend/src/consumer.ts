import amqp from "amqplib";
import fs from "fs/promises";
import { Channel } from "amqplib";

const exchange = "math_platform_exchange";

// Масив шаблонів (routing patterns), на які підписується consumer
const topics = [
  "platform.*.*",
  "user.*.*",
  "student.*.*",
  "teacher.*.*",
  "admin.*.*",
  "ai.*.*",
];

// Тип для структури повідомлення
interface ProcessedMessage {
  component?: string | undefined;
  action?: string | undefined;
  role?: string | undefined;
  payload: any;
  timestamp: string;
  result?: string | undefined;
}
// Функція для логування помилок у файл
async function logError(err: any) {
  const errorText = err instanceof Error ? err.stack : String(err);
  console.error("[Consumer] Error:", errorText);
  await fs.appendFile(
    "errors.log",
    `[${new Date().toISOString()}] ${errorText}\n`
  );
}

async function consumeMessages() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel: Channel = await connection.createChannel();

    await channel.assertExchange(exchange, "topic", { durable: true });
    const q = await channel.assertQueue("", { exclusive: true }); // Тимчасова черга exclusive означає, що черга прив’язана до цього підключення і буде видалена при його закритті.

    for (const topic of topics) {
      // Прив’язка черги до кожного шаблону з масиву topics
      await channel.bindQueue(q.queue, exchange, topic);
    }

    console.log(
      "[Consumer]  Waiting for messages from all platform modules..."
    );

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      let payload: any;
      const routingKey = msg.fields.routingKey;

      try {
        payload = JSON.parse(msg.content.toString());
        const [component, action, role] = routingKey.split(".");

        const originalText = payload.text || "";
        const processedText = originalText.toUpperCase(); // Конвертація у верхній регістр

        const processed: ProcessedMessage = {
          component,
          action,
          role,
          payload,
          timestamp: new Date().toISOString(),
        };

        switch (component) {
          case "user":
            switch (action) {
              case "register":
                processed.result = `Новий користувач [${role}] зареєструвався.`;
                break;
              case "login":
                processed.result = `Користувач [${role}] авторизувався.`;
                break;
              case "support":
                processed.result = `Повідомлення у техпідтримку: "${processedText}"`;
                break;
              case "update":
                processed.result = `Користувач [${role}] оновив особисту інформацію.`;
                break;
              case "results":
                processed.result = `Користувач [${role}] переглянув результати.`;
                break;
              default:
                processed.result = `USER EVENT (${action}): ${processedText}`;
            }
            break;

          case "student":
            switch (action) {
              case "takeTest":
                processed.result = `Учень [${role}] пройшов тест: "${processedText}"`;
                break;
              case "joinGame":
                processed.result = `Учень [${role}] додався до гри.`;
                break;
              case "schedule":
                processed.result = `Учень [${role}] побудував або змінив графік.`;
                break;
              default:
                processed.result = `STUDENT EVENT (${action}): ${processedText}`;
            }
            break;

          case "teacher":
            switch (action) {
              case "addMaterials":
                processed.result = `Викладач [${role}] додав навчальні матеріали.`;
                break;
              case "createTest":
                processed.result = `Викладач [${role}] створив тест.`;
                break;
              case "viewStats":
                processed.result = `Викладач [${role}] переглянув статистику.`;
                break;
              default:
                processed.result = `TEACHER EVENT (${action}): ${processedText}`;
            }
            break;

          case "admin":
            switch (action) {
              case "launchGame":
                processed.result = `Адмін [${role}] запустив гру.`;
                break;
              case "viewStats":
                processed.result = `Адмін [${role}] переглянув статистику.`;
                break;
              case "manageUsers":
                processed.result = `Адмін [${role}] керує користувачами.`;
                break;
              default:
                processed.result = `ADMIN EVENT (${action}): ${processedText}`;
            }
            break;

          case "ai":
            switch (action) {
              case "ask":
                processed.result = `Учень [${role}] звернувся до ШІ: "${processedText}"`;
                break;
              default:
                processed.result = `AI EVENT (${action}): ${processedText}`;
            }
            break;

          case "platform":
            switch (action) {
              case "browse":
                processed.result = `Користувач [${role}] переглядає платформу.`;
                break;
              case "update":
                processed.result = `Системне оновлення платформи (${role}): ${processedText}`;
                break;
              default:
                processed.result = `PLATFORM EVENT (${action}): ${processedText}`;
            }
            break;

          default:
            processed.result = `UNKNOWN COMPONENT EVENT: ${routingKey}`;
        }

        // Зберігання у файл
        await fs.appendFile("messages.json", JSON.stringify(processed) + "\n");
        console.log(`[Consumer] ${processed.result}`);
        channel.ack(msg); // Підтвердження успішної обробки
      } catch (err) {
        // Логування помилок парсингу або обробки
        await logError(
          `Failed to process message with key ${routingKey}. Content: ${msg.content.toString()}. Error: ${err}`
        );
        channel.nack(msg, false, false); // Відхилення повідомлення без повторної черги
      }
    });
  } catch (error) {
    // Логування фатальних помилок з'єднання
    await logError(error);
  }
}

consumeMessages();
