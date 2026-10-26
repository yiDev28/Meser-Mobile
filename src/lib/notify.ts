import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface OrderReadyEvent {
  orderId: string;
  status: string;
  scope?: "order" | "item";
  localNumber?: number;
  typeName?: string;
  typeColor?: string;
}

export async function requestNotificationPermissions(): Promise<void> {
  try {
    await LocalNotifications.requestPermissions();
  } catch {
    // ignore
  }
}

export function startOrderListener(
  host: string,
  port: number,
  token: string,
  onEvent: (event: OrderReadyEvent) => void
): () => void {
  const es = new EventSource(
    `http://${host}:${port}/api/orders/events?token=${encodeURIComponent(token)}`
  );
  es.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as OrderReadyEvent;
      if (data?.orderId) onEvent(data);
    } catch {
      // ignore
    }
  };
  es.onerror = () => {
    // EventSource reintenta solo
  };
  return () => es.close();
}

const MAX_NOTIFICATION_ID = 2147483647;
let notificationSeq = 0;

function nextNotificationId(): number {
  notificationSeq = (notificationSeq + 1) % 1000;
  return (Date.now() % (MAX_NOTIFICATION_ID - 1000)) + notificationSeq + 1;
}

export async function notifyOrderReady(event: OrderReadyEvent, badge = 1): Promise<void> {
  const label = event.localNumber ? `Orden #${event.localNumber}` : "Un pedido";
  const type = event.typeName ? ` · ${event.typeName}` : "";

  // Vibración más larga: doble golpe háptico
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((r) => setTimeout(r, 120));
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // ignore
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          channelId: "orders",
          sound: "meser_bell.mp3",
          title: "Pedido listo para entregar",
          body: `${label}${type} está listo para servir`,
          id: nextNotificationId(),
          badge,
          extra: { orderId: event.orderId, localNumber: event.localNumber ?? null },
        },
      ],
    });
  } catch (err) {
    console.error("No se pudo publicar la notificación de pedido listo:", err);
  }
}
