import { connectRabbit } from "../../shared/rabbit";

(async () => {
  const { channel } = await connectRabbit();
  await channel.assertExchange("platform", "topic");

  channel.publish("platform", "ai.answer", Buffer.from(JSON.stringify({
    component: "ai",
    action: "answer",
    payload: "42",
    timestamp: new Date().toISOString()
  })));

  console.log("AI answered");
})();
