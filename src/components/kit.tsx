import type { ComponentType, ReactNode } from "react";
import { createPortal } from "react-dom";
import type { OrderDTO, TableDTO } from "../lib/types";
import type { PendingOrder } from "../lib/cache";
import { TABLE_OCCUPIED_CODE } from "../lib/api";
import {
  AddIcon,
  ChairIcon,
  CloudOffIcon,
  DeleteIcon,
  MapPinIcon,
  OrderStatusIcon,
  OrderTypeIcon,
  RefreshIcon,
  TableIcon,
  WarningIcon,
} from "./icons";
import { Button, formatTime, toneOf, Chip } from "./ui";

export function TopBar({
  title,
  subtitle,
  left,
  right,
  large,
  variant = "default",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  large?: boolean;
  variant?: "default" | "brand";
}) {
  const brand = variant === "brand";
  return (
    <header
      className={`sticky top-0 z-10 safe-top-compact ${
        brand ? "hero-gradient border-b border-white/20" : "bg-surface/95 backdrop-blur border-b border-outline/60"
      }`}
    >
      <div
        className={`app-width px-4 flex items-center justify-between gap-2 ${large ? "pt-2.5 pb-3 items-end" : "pt-2.5 pb-2"}`}
      >
        {left && <div className="shrink-0">{left}</div>}
        <div className={`min-w-0 ${left || right ? "flex-1" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            {brand && (
              <img src="/logo-marca.png" alt="Meser" className="w-7 h-7 rounded-lg bg-white shrink-0 shadow-sm" />
            )}
            <h1
              className={`truncate leading-tight ${large ? "text-[26px] font-black" : "text-lg font-extrabold"} ${
                brand ? "text-white drop-shadow-sm" : "text-neutral-dark"
              }`}
            >
              {title}
            </h1>
          </div>
          {subtitle &&
            (typeof subtitle === "string" ? (
              <p className={`text-xs truncate mt-0.5 ${brand ? "text-white/80" : "text-neutral-gray"}`}>{subtitle}</p>
            ) : (
              <div className="mt-1.5 flex min-w-0">{subtitle}</div>
            ))}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}

export interface PrimaryAction {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  dot?: boolean;
  disabled?: boolean;
  action: () => void;
  secondary?: {
    label: string;
    icon?: ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
  };
}
export interface BottomNavTab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

export function ServerStatus({ state, onDark = false }: { state: "online" | "offline" | "connecting"; onDark?: boolean }) {
  const states = {
    online: { label: "En línea", dot: "bg-success", tone: "text-success", bg: "bg-success/15" },
    offline: { label: "Sin conexión", dot: "bg-danger", tone: "text-danger", bg: "bg-danger/15" },
    connecting: { label: "Conectando", dot: "bg-warn", tone: "text-warn", bg: "bg-warn/15" },
  };
  const st = states[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-xs font-bold whitespace-nowrap ${
        onDark ? "bg-white/15 text-white" : `${st.bg} ${st.tone}`
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${st.dot} ${state === "connecting" ? "animate-pulse" : ""}`} />
      {st.label}
    </span>
  );
}

export function BottomNav({
  tabs,
  active,
  onSelect,
  center,
}: {
  tabs: BottomNavTab[];
  active?: string;
  onSelect: (id: string) => void;
  center?: {
    label: string;
    onClick: () => void;
    active?: boolean;
    icon?: ComponentType<{ className?: string }>;
    dot?: boolean;
    disabled?: boolean;
    secondary?: {
      label: string;
      icon?: ComponentType<{ className?: string }>;
      onClick: () => void;
      disabled?: boolean;
    };
  };
}) {
  const mid = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, mid);
  const right = tabs.slice(mid);

  const renderTab = (t: BottomNavTab) => {
    const isActive = active === t.id;
    const Icon = t.icon;
    return (
      <button
        key={t.id}
        onClick={() => onSelect(t.id)}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
        aria-label={t.label}
      >
        <span
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive ? "text-primary" : "text-neutral-gray"
          }`}
        >
          <Icon className={`w-6 h-6 ${isActive ? "text-primary" : ""}`} />
          <span className="text-[10px] font-bold">{t.label}</span>
        </span>
        {!!t.badge && t.badge > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-black tabular-nums leading-none">
            {t.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-outline/70"
      style={{ paddingBottom: "min(max(var(--safe-bottom), 6px), 40px)" }}
    >
      <div className="app-width grid grid-cols-[1fr_auto_1fr] px-2">
        <div className="flex justify-around">{left.map(renderTab)}</div>
        <div className="flex flex-row items-end justify-center gap-3">
          {center?.secondary && (
            <div className="flex flex-col items-center px-1 -mt-6">
              <button
                onClick={center.secondary.onClick}
                disabled={center.secondary.disabled}
                className="w-14 h-14 rounded-full bg-surface text-primary flex items-center justify-center shadow-elev2 active:scale-95 transition-transform disabled:opacity-60 border border-outline"
                aria-label={center.secondary.label}
              >
                {center.secondary.icon ? <center.secondary.icon className="w-7 h-7" /> : <AddIcon className="w-7 h-7" />}
              </button>
              <span className="text-[10px] font-bold text-primary mt-0.5">{center.secondary.label}</span>
            </div>
          )}
          {center && (
            <div className="flex flex-col items-center px-1 -mt-6">
              <button
                onClick={center.onClick}
                disabled={center.disabled}
                className={`relative w-14 h-14 rounded-full gradient-brand text-white flex items-center justify-center shadow-elev2 active:scale-95 transition-transform disabled:opacity-60 ${center.active ? "ring-4 ring-primary/30" : ""}`}
                aria-label={center.label}
              >
                {center.icon ? <center.icon className="w-7 h-7" /> : <AddIcon className="w-7 h-7" />}
                {center.dot && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-danger border-2 border-white" />
                )}
              </button>
              <span className="text-[10px] font-bold text-primary mt-0.5">{center.label}</span>
            </div>
          )}
        </div>
        <div className="flex justify-around">{right.map(renderTab)}</div>
      </div>
    </nav>
  );
}

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30 animate-fade" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 bg-surface rounded-t-3xl px-5 pt-5 shadow-elev3 animate-sheet-up"
        style={{ paddingBottom: "min(max(var(--safe-bottom), 20px), 40px)" }}
      >
        <div className="app-width">{children}</div>
      </div>
    </div>,
    document.body
  );
}

const STATE_TONE: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "text-warn", bg: "bg-warn/15" },
  PREPARATION: { color: "text-secondary", bg: "bg-secondary/15" },
  READY: { color: "text-neutral-dark", bg: "bg-tertiary/30" },
  DELIVERED: { color: "text-success", bg: "bg-success/15" },
  CANCELED: { color: "text-danger", bg: "bg-danger/15" },
  INVOICED: { color: "text-neutral-gray", bg: "bg-neutral-light/70" },
};

export function StatusChip({
  status,
}: {
  status?: { paramStatus?: string; name?: string } | null;
}) {
  if (!status) return null;
  const tone = STATE_TONE[status.paramStatus ?? ""] ?? STATE_TONE.INVOICED;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tone.bg} ${tone.color}`}>
      <OrderStatusIcon status={status.paramStatus ?? ""} className="w-3.5 h-3.5" />
      {status.name}
    </span>
  );
}

export function Stepper({ step, total }: { step: number; total: number }) {
  const dots: ReactNode[] = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <span
        key={i}
        className={`h-1.5 rounded-full transition-all ${i <= step ? "gradient-brand w-6" : "bg-neutral-light w-3"}`}
      />
    );
  }
  return <div className="flex items-center gap-1.5">{dots}</div>;
}

export function OrderCard({ order, onClick }: { order: OrderDTO; onClick: () => void }) {
  const typeColor = order.type?.colorLabel || "#fb7318";
  const tone = toneOf(typeColor);
  return (
    <button
      onClick={onClick}
      className="w-full text-left app-surface overflow-hidden shadow-elev1 transition-transform active:scale-[0.99]"
    >
      <span className="block h-1.5 w-full" style={{ backgroundColor: typeColor }} />
      <span className="block p-4">
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: typeColor, color: tone.text }}
          >
            <OrderTypeIcon type={order.type?.paramType ?? ""} className="w-6 h-6" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-primary tabular-nums">#{order.localNumber}</span>
              <Chip color={order.type?.colorLabel || "#fb7318"} size="sm">
                {order.type?.name || "Pedido"}
              </Chip>
            </div>
            {(order.metadataOrder?.[0]?.nameCustomer || order.table?.name) && (
              <p className="text-xs text-neutral-gray mt-1 truncate">
                {order.metadataOrder?.[0]?.nameCustomer}
                {order.table?.name
                ? (order.metadataOrder?.[0]?.nameCustomer ? " · " : "") +
                  (order.table.name.toLowerCase().startsWith("mesa") ? order.table.name : `Mesa ${order.table.name}`)
                : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusChip status={order.orderStatus} />
            <span className="text-[11px] text-neutral-gray">{formatTime(order.createdAt)}</span>
          </div>
        </div>
      </span>
    </button>
  );
}

export function PendingOrderCard({
  order,
  onRetry,
  onRemove,
  onChangeTable,
}: {
  order: PendingOrder;
  onRetry: () => void;
  onRemove: () => void;
  onChangeTable?: () => void;
}) {
  const s = order.snapshot;
  const isTableConflict =
    order.errorCode === TABLE_OCCUPIED_CODE ||
    Boolean(order.error && /ocupada/i.test(order.error));
  return (
    <div className="w-full p-4 rounded-[14px] bg-warn/10 border-2 border-dashed border-warn/40">
      <div className="flex items-center gap-3">
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: s?.typeColor || "#d8800d" }}
        >
          {isTableConflict ? <TableIcon className="w-6 h-6" /> : <CloudOffIcon className="w-6 h-6" />}
        </span>
        <div className="flex-1 min-w-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
              isTableConflict ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"
            }`}
          >
            {isTableConflict ? (
              <>
                <WarningIcon className="w-3.5 h-3.5" />
                Mesa ocupada
              </>
            ) : (
              <>
                <CloudOffIcon className="w-3.5 h-3.5" />
                Sin sincronizar
              </>
            )}
          </span>
          <p className="text-sm font-bold text-neutral-dark truncate mt-1">
            {s?.typeName || "Pedido"}
            {s?.label ? ` · ${s.label}` : ""}
          </p>
          <p className="text-xs text-neutral-gray mt-0.5">
            {s?.itemCount && s.itemCount > 0 ? `${s.itemCount} producto${s.itemCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span className="text-[11px] text-neutral-gray shrink-0">
          {formatTime(new Date(order.createdAt).toISOString())}
        </span>
      </div>
      {order.error && (
        <p className="text-xs text-danger mt-2 bg-danger/10 px-2.5 py-1.5 rounded-lg">
          {isTableConflict ? order.error : `Error al sincronizar: ${order.error}`}
        </p>
      )}
      <div className="flex gap-2 mt-3 flex-wrap">
        {isTableConflict && onChangeTable ? (
          <button
            onClick={onChangeTable}
            className="flex-1 px-3 py-2 rounded-full gradient-brand text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform shadow-sm"
          >
            <TableIcon className="w-4 h-4" />
            Elegir otra mesa
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="flex-1 px-3 py-2 rounded-full bg-warn text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
          >
            <RefreshIcon className="w-4 h-4" />
            Enviar ahora
          </button>
        )}
        <button
          onClick={onRemove}
          className="px-3 py-2 rounded-full bg-surface border border-neutral-light text-neutral-dark text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
        >
          <DeleteIcon className="w-4 h-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
}

export function TableSuggestionSheet({
  open,
  occupiedTableName,
  preferredLocationId,
  preferredLocationName,
  tables,
  busy = false,
  actionLabel = "Seleccionar y continuar",
  onSelectTable,
  onClose,
}: {
  open: boolean;
  occupiedTableName: string;
  preferredLocationId?: number | null;
  preferredLocationName?: string | null;
  tables: TableDTO[];
  busy?: boolean;
  actionLabel?: string;
  onSelectTable: (table: TableDTO) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const freeTables = tables
    .filter((t) => t.statusTab !== "OCCUPIED")
    .sort((a, b) => {
      const aSameLoc =
        preferredLocationId != null
          ? a.locationId === preferredLocationId
          : Boolean(preferredLocationName && a.locationName === preferredLocationName);
      const bSameLoc =
        preferredLocationId != null
          ? b.locationId === preferredLocationId
          : Boolean(preferredLocationName && b.locationName === preferredLocationName);
      if (aSameLoc !== bSameLoc) return aSameLoc ? -1 : 1;
      const aFree = a.statusTab === "FREE";
      const bFree = b.statusTab === "FREE";
      if (aFree !== bFree) return aFree ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "", "es", { numeric: true });
    });

  const cleanOccupied = occupiedTableName.replace(/^Mesa\s*/i, "").trim() || occupiedTableName;

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
            <WarningIcon className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black text-neutral-dark leading-snug">
              La Mesa {cleanOccupied} acaba de ser ocupada
            </p>
            <p className="text-xs text-neutral-gray mt-0.5">
              {actionLabel}. Tu pedido se mantendrá intacto.
            </p>
          </div>
        </div>

        {freeTables.length === 0 ? (
          <div className="py-6 text-center text-sm text-neutral-gray bg-background rounded-2xl px-4">
            No hay mesas libres disponibles en este momento.
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto pr-1 -mx-1 px-1 space-y-2 pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-neutral-gray">
              Mesas disponibles sugeridas ({freeTables.length})
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {freeTables.map((t) => {
                const label = t.name.replace(/^Mesa\s*/i, "").trim() || t.name;
                const location = t.locationName?.trim() || null;
                const isSameZone =
                  (preferredLocationId != null && t.locationId === preferredLocationId) ||
                  (preferredLocationName && location === preferredLocationName);
                const reserved = t.statusTab === "RESERVED";
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSelectTable(t)}
                    className={`relative flex items-center gap-2.5 app-surface px-3 py-2.5 text-left transition-all active:scale-[0.97] border ${
                      isSameZone ? "border-primary/40 shadow-elev1" : "border-outline/40"
                    }`}
                  >
                    <span className="w-10 h-10 shrink-0 rounded-xl gradient-brand flex items-center justify-center text-white shadow-sm">
                      <TableIcon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-sm text-neutral-dark leading-tight truncate">
                        Mesa {label}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-neutral-gray mt-0.5 tabular-nums">
                        <ChairIcon className="w-3.5 h-3.5" />
                        {t.seats}
                        {reserved && <span className="text-warn font-bold ml-1">· Reservada</span>}
                      </span>
                      {location && (
                        <span className="flex items-center gap-1 text-[10px] text-neutral-gray mt-0.5 truncate">
                          <MapPinIcon className="w-3 h-3 shrink-0" />
                          {location}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button full variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}