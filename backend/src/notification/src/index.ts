import { connectRabbit } from "@shared/rabbit";

(async () => {
  const { channel } = await connectRabbit();

  await channel.assertExchange("platform", "topic");

  await channel.assertQueue("notifications");
  await channel.bindQueue("notifications", "platform", "quiz.#");

  channel.consume("notifications", msg => {
    console.log("NOTIFY => ", msg?.content.toString());
    msg && channel.ack(msg);
  });
})();
