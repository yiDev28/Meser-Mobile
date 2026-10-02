import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { OrderDTO } from "../lib/types";
import { ApiError, imageUrl } from "../lib/api";
import { Chip, ProductThumb, Spinner, formatMoney, formatTime } from "../components/ui";
import { StatusChip } from "../components/kit";
import { NotesIcon } from "../components/icons";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PREPARATION: "#fb7318",
  DELIVERED: "#16a34a",
  CANCELED: "#dc2626",
  INVOICED: "#6b7280",
};

export default function OrderDetailPage({
  orderId,
  setHeader,
  registerBack,
}: {
  orderId: string;
  setHeader: (h: { title: ReactNode; subtitle?: ReactNode }) => void;
  registerBack: (fn: (() => void) | null) => void;
}) {
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

  useEffect(() => {
    setHeader({
      title: order ? `Orden #${order.localNumber}` : "Detalle de orden",
      subtitle: order?.type?.name || "Cargando…",
    });
    registerBack(() => navigate({ name: "orders" }));
  }, [order, setHeader, registerBack, navigate]);

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
          onClick={() => navigate({ name: "orders" })}
          className="px-4 py-2 rounded-xl bg-surface border border-neutral-light text-neutral-dark font-semibold"
        >
          Volver
        </button>
      </div>
    );
  }

  const guest = order.guestCustomer;
  const customerName = guest?.name || order.metadataOrder?.[0]?.nameCustomer;
  const itemTotal = order.items.reduce(
    (s, it) => s + Number(it.menuItem?.price ?? 0) * Number(it.quantity ?? 0),
    0
  );
  const typeColor = order.type?.colorLabel || "#fb7318";

  return (
    <div className="min-h-screen flex flex-col animate-fade pb-32 topbar-offset">
      <main className="flex-1 px-4 py-4 space-y-4">
        <div className="app-surface overflow-hidden shadow-elev2">
          <div className="h-2 w-full" style={{ backgroundColor: typeColor }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-neutral-gray">Orden</p>
                <p className="text-3xl font-black text-primary tabular-nums leading-none mt-0.5">
                  #{order.localNumber}
                </p>
                <div className="mt-2">
                  <Chip color={typeColor} size="sm">
                    {order.type?.name || "—"}
                  </Chip>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusChip status={order.orderStatus} />
                <span className="text-[11px] text-neutral-gray">{formatTime(order.createdAt)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-light space-y-2">
              {order.table && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-gray">Mesa</span>
                  <span className="font-semibold text-neutral-dark">
                    {order.table.name.toLowerCase().startsWith("mesa") ? order.table.name : `Mesa ${order.table.name}`}
                  </span>
                </div>
              )}
              {customerName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-gray">Cliente</span>
                  <span className="font-semibold text-neutral-dark text-right">{customerName}</span>
                </div>
              )}
              {guest?.address && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-gray shrink-0">Dirección</span>
                  <span className="text-sm text-neutral-dark text-right">{guest.address}</span>
                </div>
              )}
              {guest?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-gray">Teléfono</span>
                  <span className="text-sm text-neutral-dark tabular-nums">{guest.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="app-surface p-4 shadow-elev1">
          <h2 className="font-bold text-neutral-dark mb-3">Productos</h2>
          <div className="divide-y divide-neutral-light">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center gap-3">
                <ProductThumb
                  src={imageUrl(api?.base ?? "", item.menuItem?.product?.imagePath || item.menuItem?.product?.urlImage)}
                  alt={item.menuItem?.product?.name ?? ""}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-dark">{item.menuItem?.product?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.itemStatus && (
                      <Chip color={STATUS_COLORS[item.itemStatus.paramStatus] || "#6b7280"}>
                        {item.itemStatus.name}
                      </Chip>
                    )}
                    {item.menuItem?.price && (
                      <span className="text-xs text-neutral-gray tabular-nums">
                        {formatMoney(item.menuItem.price)} c/u
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-neutral-gray mt-1 flex items-center gap-1">
                      <NotesIcon className="w-4 h-4" /> {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {item.menuItem?.price && (
                    <span className="font-black text-primary tabular-nums">
                      {formatMoney(Number(item.menuItem.price) * Number(item.quantity ?? 0))}
                    </span>
                  )}
                  <span className="text-xs text-neutral-gray tabular-nums">x{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          {order.metadataOrder?.[0]?.notesOrder && (
            <p className="text-xs text-neutral-gray mt-3 bg-background rounded-xl px-3 py-2 flex items-start gap-1">
              <NotesIcon className="w-4 h-4 shrink-0 mt-0.5" /> Nota de la orden: {order.metadataOrder[0].notesOrder}
            </p>
          )}
          <div className="mt-4 pt-3 border-t border-neutral-light flex items-center justify-between">
            <span className="text-sm text-neutral-gray">Productos de la orden</span>
            <span className="font-bold text-neutral-dark">
              {order.items.reduce((s, it) => s + Number(it.quantity ?? 0), 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-light flex items-center justify-between">
            <span className="font-bold text-neutral-dark">Total</span>
            <span className="text-xl font-black text-primary tabular-nums">{formatMoney(itemTotal)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}