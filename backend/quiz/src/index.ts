import { connectRabbit } from "../../shared/rabbit";

(async () => {
  const { channel } = await connectRabbit();

  await channel.assertExchange("platform", "topic");

  await channel.assertQueue("quiz");
  channel.bindQueue("quiz", "platform", "auth.register");

  channel.consume("quiz", msg => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    console.log("Quiz received user:", data.payload.email);
    channel.ack(msg);
  });

})();
