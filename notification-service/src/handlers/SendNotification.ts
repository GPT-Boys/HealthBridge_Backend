import { Notification, INotification } from "../mongo";

export async function handleNotification(data: INotification): Promise<void> {
  try {
    const notif = new Notification({
      userId: data.userId,
      message: data.message,
      type: data.type || "general",
    });
    await notif.save();
    console.log(`✅ Notificación guardada para usuario ${data.userId}`);
  } catch (err: any) {
    console.error("❌ Error procesando notificación:", err.message);
  }
}
