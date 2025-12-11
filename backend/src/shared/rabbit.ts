import amqp from "amqplib";

export async function connectRabbit() {
  const connection = await amqp.connect("amqp://rabbitmq");
  const channel = await connection.createChannel();
  return { connection, channel };
}
