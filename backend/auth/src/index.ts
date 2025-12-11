import { connectRabbit } from "../../shared/rabbit";
import { PlatformEvent } from "../../shared/types";

(async () => {
  const { channel } = await connectRabbit();

  await channel.assertExchange("platform", "topic");

  const event: PlatformEvent = {
    component: "auth",
    action: "register",
    payload: { email: "test@example.com" },
    timestamp: new Date().toISOString()
  };

  channel.publish("platform", "auth.register", Buffer.from(JSON.stringify(event)));

  console.log("Auth sent register event");
})();
