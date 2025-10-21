import amqp from "amqplib";
import { config } from "./config";
import { handleNotification } from "./handlers/SendNotification";

export async function connectRabbit(): Promise<void> {
  try {
    const connection = await amqp.connect(config.rabbitUrl);
    const channel = await connection.createChannel();
    const queue = "notifications";

    await channel.assertQueue(queue, { durable: true });
    console.log(`✅ Conectado a RabbitMQ – escuchando cola: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        console.log("📨 Mensaje recibido:", data);
        await handleNotification(data);
        channel.ack(msg);
      }
    });
  } catch (err: any) {
    console.error("❌ Error conectando a RabbitMQ:", err.message);
    setTimeout(connectRabbit, 5000);
  }
}
