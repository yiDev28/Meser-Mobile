import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { OrderDTO } from "../lib/types";
import { ApiError } from "../lib/api";
import { Button, Chip, EmptyState, Spinner, formatMoney, formatTime } from "../components/ui";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PREPARATION: "#fb7318",
  DELIVERED: "#16a34a",
  CANCELED: "#dc2626",
  INVOICED: "#6b7280",
};

export default function HomePage() {
  const { session, connection, api, navigate, logout, disconnect } = useAuth();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const data = await api.getCurrentOrders();
      setOrders(data);
      setError("");
      setLastSync(new Date());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        logout();
        return;
      }
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el panel.");
    } finally {
      setLoading(false);
    }
  }, [api, logout]);

  useEffect(() => {
    void load();
    timerRef.current = window.setInterval(() => void load(), 15000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [load]);

  return (
    <div className="min-h-screen flex flex-col animate-fade pb-24">
      <header className="bg-surface border-b border-neutral-light sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-neutral-dark">
              {connection?.clientName || "Meser"}
            </h1>
            <p className="text-xs text-neutral-gray">
              {session?.name || session?.username} · {connection?.host}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="p-2 rounded-lg hover:bg-background transition-colors text-neutral-gray"
              aria-label="Actualizar"
            >
              <RefreshIcon spinning={loading} />
            </button>
            <button
              onClick={disconnect}
              className="text-xs text-neutral-gray hover:text-primary transition-colors px-2 py-1"
            >
              Servidor
            </button>
            <button
              onClick={logout}
              className="text-xs text-neutral-gray hover:text-primary transition-colors px-2 py-1"
            >
              Salir
            </button>
          </div>
        </div>
        {lastSync && (
          <p className="text-[11px] text-neutral-gray mt-1">
            Actualizado {lastSync.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · se actualiza cada 15s
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-4">
        {error && orders.length === 0 && (
          <div className="bg-danger/10 text-danger text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Sin pedidos en curso"
            subtitle="Presiona Nuevo pedido para tomar uno"
          />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate({ name: "order-detail", orderId: o.id })}
                className="w-full text-left bg-surface rounded-2xl shadow-sm p-4 transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-primary">#{o.localNumber}</span>
                    <Chip color={o.type?.colorLabel || "#f9cb43"}>{o.type?.name || "Pedido"}</Chip>
                  </div>
                  {o.orderStatus && (
                    <Chip color={STATUS_COLORS[o.orderStatus.paramStatus] || "#6b7280"}>
                      {o.orderStatus.name}
                    </Chip>
                  )}
                </div>
                {o.metadataOrder?.[0]?.nameCustomer && (
                  <p className="text-sm text-neutral-dark mt-1 font-medium">
                    {o.metadataOrder[0].nameCustomer}
                  </p>
                )}
                {o.table?.name && <p className="text-xs text-neutral-gray mt-0.5">Mesa {o.table.name}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-neutral-gray">{formatTime(o.createdAt)}</span>
                  <span className="font-bold text-neutral-dark">{formatMoney(o.total)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-20">
        <Button full className="shadow-xl py-4 text-base" onClick={() => navigate({ name: "new-order" })}>
          ＋ Nuevo pedido
        </Button>
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`}
    >
      <path d="M21.5 2v6h-6" />
      <path d="M2.5 22v-6h6" />
      <path d="M3.5 9a9 9 0 0 1 14.9-3.4L21.5 8" />
      <path d="M20.5 15a9 9 0 0 1-14.9 3.4L2.5 16" />
    </svg>
  );
}