import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface OrderReadyEvent {
  orderId: string;
  status: string;
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
  onReady: (event: OrderReadyEvent) => void
): () => void {
  const es = new EventSource(
    `http://${host}:${port}/api/orders/events?token=${encodeURIComponent(token)}`
  );
  es.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as OrderReadyEvent;
      if (data.status === "READY") onReady(data);
    } catch {
      // ignore
    }
  };
  es.onerror = () => {
    // EventSource reintenta solo
  };
  return () => es.close();
}

export async function notifyOrderReady(event: OrderReadyEvent): Promise<void> {
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
    const audio = new Audio("/sounds/floraphonic-servant-bell-ring.mp3");
    audio.volume = 0.7;
    await audio.play();
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
          id: Date.now(),
        },
      ],
    });
  } catch {
    // ignore
  }
}
