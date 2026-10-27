import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { OrderDTO } from "../lib/types";
import { ApiError } from "../lib/api";
import { getCachedOrders, getPendingOrders, removePendingOrder, saveCachedTables, saveOrders, updatePendingOrderError, type PendingOrder } from "../lib/cache";
import { notifyOrderReady, requestNotificationPermissions, startOrderListener } from "../lib/notify";
import { BottomNav, ServerStatus, Sheet, TopBar, type PrimaryAction } from "./kit";
import { LocalNotifications } from "@capacitor/local-notifications";
import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

interface NotificationTapPlugin {
  consume(): Promise<void>;
  addListener(
    eventName: "notificationTapped",
    listenerFunc: (data: Record<string, unknown>) => void
  ): Promise<PluginListenerHandle>;
}

const NotificationTap = registerPlugin<NotificationTapPlugin>("NotificationTap");
import { Button } from "./ui";
import { ArrowBackIcon, CloseIcon, ListIcon, LogoutIcon, PersonIcon, RefreshIcon } from "./icons";
import HomePage from "../pages/HomePage";
import NewOrderPage from "../pages/NewOrderPage";
import OrderDetailPage from "../pages/OrderDetailPage";

export interface HeaderInfo {
  title: ReactNode;
  subtitle?: ReactNode;
}

export default function AppShell() {
  const { screen, navigate, session, connection, api, logout } = useAuth();

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [online, setOnline] = useState<"online" | "offline" | "connecting">("online");
  const [menuOpen, setMenuOpen] = useState(false);
  const [primary, setPrimary] = useState<PrimaryAction | null>(null);
  const [detailSignal, setDetailSignal] = useState<{ orderId: string; nonce: number } | null>(null);
  const [catalogSignal, setCatalogSignal] = useState<{ kind: "tables" | "full"; nonce: number } | null>(null);
  const [header, setHeader] = useState<HeaderInfo>({ title: "Meser" });
  const headerOwner = useRef<string | null>(null);
  const backRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);

  const isOrders = screen.name === "home" || screen.name === "orders";
  const isNew = screen.name === "new-order";
  const isDetail = screen.name === "order-detail";
  const currentDetailId = screen.name === "order-detail" ? screen.orderId : null;

  const refreshPending = useCallback(async () => {
    setPending(await getPendingOrders());
  }, []);

  const load = useCallback(async () => {
    if (!api) return;
    void refreshPending();

    // 1) Mostrar las órdenes cacheadas de inmediato (no esperar al servidor)
    const cached = await getCachedOrders();
    if (cached) {
      setOrders(cached.orders);
      setLastSync(new Date(cached.updatedAt));
      setLoading(false);
    }

    // 2) Refrescar desde el servidor en segundo plano
    try {
      const data = await api.getCurrentOrders();
      setOrders(data);
      void saveOrders(data);
      setError("");
      setOnline("online");
      setLastSync(new Date());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        logout();
        return;
      }
      if (!cached) {
        setError(e instanceof ApiError ? e.message : "No se pudo cargar el panel.");
      }
      setOnline("offline");
    } finally {
      setLoading(false);
    }
  }, [api, logout, refreshPending]);

  const flushPending = useCallback(async () => {
    if (!api || flushingRef.current) return;
    flushingRef.current = true;
    try {
      const list = await getPendingOrders();
      if (list.length === 0) return;
      let changed = false;
      for (const rec of list) {
        const backoffMs = Math.min(2 ** rec.attempts * 5000, 60000);
        if (rec.attempts > 0 && Date.now() - rec.createdAt < backoffMs) continue;
        try {
          await api.createOrder(rec.payload);
          await removePendingOrder(rec.localId);
          changed = true;
        } catch (e) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            logout();
            break;
          }
          if (e instanceof ApiError && e.status === 0) {
            await updatePendingOrderError(rec.localId, "Sin conexión");
            changed = true;
            break;
          }
          await updatePendingOrderError(rec.localId, e instanceof ApiError ? e.message : "Error al sincronizar");
          changed = true;
        }
      }
      if (changed) {
        setPending(await getPendingOrders());
        void load();
      }
    } finally {
      flushingRef.current = false;
    }
  }, [api, logout, load]);

  const tick = useCallback(async () => {
    await load();
    await flushPending();
  }, [load, flushPending]);

  useEffect(() => {
    void load();
    timerRef.current = window.setInterval(() => void tick(), 15000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [load, tick]);

  useEffect(() => {
    const openOrder = (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      const notification = data.notification as { extra?: { orderId?: string } } | undefined;
      const orderId = notification?.extra?.orderId ?? (data.extra as { orderId?: string } | undefined)?.orderId;
      if (!orderId) return;
      navigate({ name: "order-detail", orderId });
    };

    const running = LocalNotifications.addListener("localNotificationActionPerformed", (data) => {
      openOrder(data as unknown as Record<string, unknown>);
    });
    const coldStart = NotificationTap.addListener("notificationTapped", (data) => {
      openOrder(data as unknown as Record<string, unknown>);
    });

    return () => {
      void running.then((handle) => handle.remove());
      void coldStart.then((handle) => handle.remove());
    };
  }, [navigate]);

  useEffect(() => {
    if (!connection?.host || !connection.port || !session?.token) return;
    void requestNotificationPermissions();
    void LocalNotifications.createChannel({
      id: "orders",
      name: "Órdenes listas",
      description: "Notificaciones de pedidos listos para entregar",
      sound: "meser_bell.mp3",
      vibration: true,
      importance: 4,
    });
    const close = startOrderListener(
      connection.host,
      connection.port,
      session.token,
      (event) => {
        if (event.status === "READY" && event.scope !== "item" && event.orderId) {
          const ready = orders.filter((o) => o.orderStatus?.paramStatus === "READY");
          const badge = ready.some((o) => o.id === event.orderId) ? ready.length : ready.length + 1;
          void notifyOrderReady(event, badge);
        }
        if (event.orderId) {
          const orderId = event.orderId;
          setDetailSignal((prev) => ({ orderId, nonce: (prev?.nonce ?? 0) + 1 }));
          void load();
        }
        if (event.tableChanged || event.type === "tables-updated") {
          setCatalogSignal((prev) => ({ kind: "tables", nonce: (prev?.nonce ?? 0) + 1 }));
          if (api) {
            void api
              .getTables()
              .then((freshTables) => saveCachedTables(freshTables))
              .catch(() => undefined);
          }
        } else if (event.type === "catalog-updated") {
          setCatalogSignal((prev) => ({ kind: "full", nonce: (prev?.nonce ?? 0) + 1 }));
        }
      }
    );
    return close;
  }, [connection?.host, connection?.port, session?.token, load, orders, api]);

  const removePending = useCallback(
    async (localId: string) => {
      await removePendingOrder(localId);
      await refreshPending();
    },
    [refreshPending]
  );

  const [lazy, setLazy] = useState<{ newOrder: boolean; detailId: string | null }>({
    newOrder: false,
    detailId: null,
  });

  useEffect(() => {
    setLazy((p) => {
      if ((isNew && p.newOrder) || (isDetail && currentDetailId === p.detailId)) return p;
      return {
        newOrder: p.newOrder || isNew,
        detailId: p.detailId ?? currentDetailId,
      };
    });
  }, [isNew, isDetail, currentDetailId]);

  const detailId = currentDetailId ?? lazy.detailId;

// El header de órdenes sí se refresca con lastSync, pero los headers de
// "nuevo pedido" y "detalle" los escriben las propias páginas: no se deben
// sobrescribir aquí o el subtítulo (tipo de pedido) se borra en cada poll.
useEffect(() => {
  if (!isOrders) return;
  setHeader({
    title: connection?.clientName || "Meser",
    subtitle: lastSync
      ? `actualizado ${lastSync.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}`
      : connection?.host,
  });
}, [isOrders, connection, lastSync]);

  // Valores por defecto mientras la página monta; las páginas los pisan después.
  useEffect(() => {
    if (isNew && headerOwner.current !== "new") {
      headerOwner.current = "new";
      setHeader({ title: "Nuevo pedido", subtitle: "Elige el tipo de pedido" });
    } else if (isDetail && headerOwner.current !== "detail") {
      headerOwner.current = "detail";
      setHeader({ title: "Detalle de orden" });
    } else if (isOrders) {
      headerOwner.current = "orders";
    }
  }, [isOrders, isNew, isDetail, setHeader]);

  const registerBack = useCallback((fn: (() => void) | null) => {
    backRef.current = fn;
  }, []);

  const showBack = isNew || isDetail;
  const BackIcon = isNew ? CloseIcon : ArrowBackIcon;
  const onClickBack = useCallback(() => {
    if (backRef.current) backRef.current();
    else navigate({ name: "orders" });
  }, [navigate]);

  const right = (
    <div className="flex items-center gap-2">
      <ServerStatus state={online} onDark />
      {isOrders && (
        <button
          onClick={() => void load()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
          aria-label="Actualizar"
        >
          <RefreshIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );

  const topBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--topbar-h", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div ref={topBarRef} className="fixed top-0 inset-x-0 z-40">
        <TopBar
          variant="brand"
          title={header.title}
          subtitle={header.subtitle}
          left={
            showBack ? (
              <button
                onClick={onClickBack}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
                aria-label={isNew ? "Cancelar" : "Volver"}
              >
                <BackIcon className="w-6 h-6" />
              </button>
            ) : undefined
          }
          right={right}
          key={screen.name}
        />
      </div>

      <main className="flex-1 min-h-0 overflow-auto">
        <div className={isOrders ? "" : "hidden"}>
          <HomePage
            orders={orders}
            loading={loading}
            error={error}
            pending={pending}
            onRetryPending={() => void flushPending()}
            onRemovePending={removePending}
            catalogSignal={catalogSignal}
          />
        </div>

        {lazy.newOrder && (
          <div className={isNew ? "" : "hidden"}>
            <NewOrderPage
              setHeader={setHeader}
              registerBack={registerBack}
              registerPrimary={setPrimary}
              refreshOrders={load}
              active={isNew}
              catalogSignal={catalogSignal}
            />
          </div>
        )}

        {detailId && (
          <div className={isDetail ? "" : "hidden"}>
            <OrderDetailPage
              orderId={detailId}
              setHeader={setHeader}
              registerBack={registerBack}
              refreshOrders={load}
              refreshSignal={detailSignal}
            />
          </div>
        )}
      </main>

      <BottomNav
        tabs={[
          { id: "orders", label: "Órdenes", icon: ListIcon, badge: pending.length },
          { id: "profile", label: "Perfil", icon: PersonIcon },
        ]}
        active={isOrders ? "orders" : undefined}
        onSelect={(id) => {
          if (id === "orders") navigate({ name: "orders" });
          else if (id === "profile") setMenuOpen(true);
        }}
        center={
          isNew && primary
            ? {
                label: primary.label,
                active: true,
                icon: primary.icon,
                disabled: primary.disabled,
                onClick: primary.action,
                secondary: primary.secondary,
              }
            : (isOrders || isDetail) && primary
              ? { label: "Continuar orden", dot: true, onClick: () => navigate({ name: "new-order" }) }
              : { label: "Nuevo", active: isNew, onClick: () => navigate({ name: "new-order" }) }
        }
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-full gradient-brand text-white flex items-center justify-center text-xl font-black shadow-elev2">
            {(session?.name || session?.username || "M").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-neutral-dark truncate">{session?.name || session?.username}</p>
            <p className="text-xs text-neutral-gray truncate">
              @{session?.username} · {connection?.host}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button full variant="danger" onClick={logout}>
            <LogoutIcon className="w-5 h-5" />
            Cerrar sesión
          </Button>
        </div>
      </Sheet>
    </div>
  );
}