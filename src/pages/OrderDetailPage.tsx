import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { OrderDTO } from "../lib/types";
import { ApiError } from "../lib/api";
import { Chip, Spinner, formatMoney, formatTime } from "../components/ui";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PREPARATION: "#fb7318",
  DELIVERED: "#16a34a",
  CANCELED: "#dc2626",
  INVOICED: "#6b7280",
};

export default function OrderDetailPage({ orderId }: { orderId: string }) {
  const { api, navigate } = useAuth();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!api) return;
      try {
        const o = await api.getOrder(orderId);
        if (mounted) {
          setOrder(o);
          setError("");
        }
      } catch (e) {
        if (mounted) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            navigate({ name: "login" });
          } else {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar la orden.");
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api, orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-danger text-center mb-4">{error || "Orden no encontrada"}</p>
        <button
          onClick={() => navigate({ name: "home" })}
          className="px-4 py-2 rounded-xl bg-surface border border-neutral-light text-neutral-dark font-semibold"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col animate-fade pb-10">
      <header className="bg-surface border-b border-neutral-light sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate({ name: "home" })}
          className="text-neutral-gray hover:text-primary transition-colors"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-neutral-dark">Orden #{order.localNumber}</h1>
        {order.orderStatus && (
          <Chip color={STATUS_COLORS[order.orderStatus.paramStatus] || "#6b7280"}>
            {order.orderStatus.name}
          </Chip>
        )}
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-gray">Tipo</span>
            <Chip color={order.type?.colorLabel || "#f9cb43"}>{order.type?.name || "—"}</Chip>
          </div>
          {order.table && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-gray">Mesa</span>
              <span className="font-semibold text-neutral-dark">{order.table.name}</span>
            </div>
          )}
          {order.guestCustomer?.name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-gray">Cliente</span>
              <span className="font-semibold text-neutral-dark">{order.guestCustomer.name}</span>
            </div>
          )}
          {order.metadataOrder?.[0]?.nameCustomer && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-gray">Cliente</span>
              <span className="font-semibold text-neutral-dark">{order.metadataOrder[0].nameCustomer}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-gray">Hora</span>
            <span className="text-sm text-neutral-dark">{formatTime(order.createdAt)}</span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-neutral-dark mb-3">Productos</h2>
          <div className="divide-y divide-neutral-light">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-neutral-dark">{item.menuItem?.product?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-neutral-gray">x{item.quantity}</span>
                    {item.itemStatus && (
                      <Chip color={STATUS_COLORS[item.itemStatus.paramStatus] || "#6b7280"}>
                        {item.itemStatus.name}
                      </Chip>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-neutral-gray mt-1">📝 {item.notes}</p>}
                </div>
                <span className="font-semibold text-neutral-dark">
                  {formatMoney(Number(item.menuItem?.price ?? 0) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          {order.metadataOrder?.[0]?.notesOrder && (
            <p className="text-xs text-neutral-gray mt-3 bg-background rounded-xl px-3 py-2">
              📝 Nota de la orden: {order.metadataOrder[0].notesOrder}
            </p>
          )}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-light">
            <span className="font-bold text-neutral-dark">Total</span>
            <span className="text-lg font-black text-primary">{formatMoney(order.total)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}