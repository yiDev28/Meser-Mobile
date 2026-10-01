import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { OrderDTO, OrderTypeDTO } from "../lib/types";
import type { PendingOrder } from "../lib/cache";
import { getCachedCatalog } from "../lib/cache";
import { EmptyState, Spinner, toneOf } from "../components/ui";
import { OrderCard, PendingOrderCard } from "../components/kit";
import { OrderTypeIcon, ShoppingCartIcon } from "../components/icons";

export default function HomePage({
  orders,
  pending,
  loading,
  error,
  onRetryPending,
  onRemovePending,
}: {
  orders: OrderDTO[];
  pending: PendingOrder[];
  loading: boolean;
  error: string;
  onRetryPending: () => void;
  onRemovePending: (localId: string) => void;
}) {
  const { navigate, api } = useAuth();
  const [types, setTypes] = useState<OrderTypeDTO[]>([]);
  const [typeFilter, setTypeFilter] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await getCachedCatalog();
      if (alive && cached.types?.length) setTypes(cached.types);
      if (api) {
        try {
          const fresh = await api.getOrderTypes();
          if (alive && fresh.length) setTypes(fresh);
        } catch {
          /* keep cached */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  const visibleTypes = useMemo(() => {
    const seen = new Map<string, { id: number | null; name: string; paramType: string; colorLabel?: string }>();
    for (const t of types) {
      seen.set(t.paramType, { id: t.id, name: t.name, paramType: t.paramType, colorLabel: t.colorLabel });
    }
    for (const o of orders) {
      if (!o.type || seen.has(o.type.paramType)) continue;
      seen.set(o.type.paramType, {
        id: o.type.id,
        name: o.type.name,
        paramType: o.type.paramType,
        colorLabel: o.type.colorLabel,
      });
    }
    return [...seen.values()];
  }, [types, orders]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const key = o.type?.paramType ?? "";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const filteredOrders = useMemo(
    () => (typeFilter === null ? orders : orders.filter((o) => o.type?.id === typeFilter)),
    [orders, typeFilter]
  );

  return (
    <div className="min-h-screen flex flex-col animate-fade pb-28 gradient-soft topbar-offset">
      <main className="flex-1 px-4 pt-3 space-y-3">
        {error && orders.length === 0 && pending.length === 0 && (
          <div className="bg-danger/10 text-danger text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-black text-warn uppercase tracking-wide flex items-center gap-2">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-warn text-white text-[11px] font-black tabular-nums">
                {pending.length}
              </span>
              Pendientes por sincronizar
            </h2>
            {pending.map((p) => (
              <PendingOrderCard
                key={p.localId}
                order={p}
                onRetry={onRetryPending}
                onRemove={() => onRemovePending(p.localId)}
              />
            ))}
          </section>
        )}

        {visibleTypes.length > 0 && (
          <section className="grid grid-cols-3 gap-2.5 mt-1">
            {visibleTypes.map((vt) => {
              const count = counts.get(vt.paramType) ?? 0;
              const typeColor = vt.colorLabel || "#fb7318";
              const tone = toneOf(typeColor);
              const selected = typeFilter === vt.id;
              return (
                <button
                  key={vt.paramType}
                  onClick={() => setTypeFilter((prev) => (prev === vt.id ? null : vt.id))}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-2 transition-all active:scale-[0.98] ${
                    selected ? "shadow-elev2 ring-2 ring-primary/40" : "shadow-elev1"
                  }`}
                  style={{ backgroundColor: typeColor, color: tone.text }}
                >
                  <span className="relative">
                    <OrderTypeIcon type={vt.paramType} className="w-7 h-7" />
                    {count > 0 && (
                      <span className="absolute -top-2.5 -right-4 min-w-[19px] h-[19px] px-1 rounded-full bg-white/90 text-neutral-dark text-[10px] font-black tabular-nums flex items-center justify-center shadow-sm">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-center leading-tight w-full" style={{ color: tone.text }}>
                    {vt.name}
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {loading && filteredOrders.length === 0 && pending.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner className="w-8 h-8" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCartIcon className="w-8 h-8" />}
            title={typeFilter === null ? "Sin pedidos en curso" : "Sin pedidos de este tipo"}
            subtitle="Presiona el botón + para tomar un pedido"
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => navigate({ name: "order-detail", orderId: o.id })} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}