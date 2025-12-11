import { connectRabbit } from "../../shared/rabbit";

(async () => {
  const { channel } = await connectRabbit();

  await channel.assertQueue("profile");
  await channel.bindQueue("profile", "platform", "auth.#");

  channel.consume("profile", msg => {
    console.log("PROFILE updated:", msg?.content.toString());
    msg && channel.ack(msg);
  });
})();
