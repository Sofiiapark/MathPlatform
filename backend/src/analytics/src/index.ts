import { connectRabbit } from "@shared/rabbit";

(async () => {
  const { channel } = await connectRabbit();

  await channel.assertQueue("analytics");
  await channel.bindQueue("analytics", "platform", "#");

  channel.consume("analytics", msg => {
    if (!msg) return;
    console.log("Analytics event:", msg.content.toString());
    channel.ack(msg);
  });
})();
