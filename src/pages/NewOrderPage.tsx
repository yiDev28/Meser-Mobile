import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addPendingOrder,
  getCachedCatalog,
  saveCatalog,
} from "../lib/cache";
import { imageUrl } from "../lib/api";
import { ApiError } from "../lib/api";
import type {
  CartItem,
  MenuDTO,
  MenuItemDTO,
  OrderTypeDTO,
  ProductCategoryDTO,
  TableDTO,
} from "../lib/types";
import { ORDER_CONST } from "../lib/types";
import { Button, Chip, Input, ProductThumb, Spinner, TextArea, formatMoney } from "../components/ui";
import { Sheet } from "../components/kit";
import {
  AddIcon,
  ChairIcon,
  CheckCircleIcon,
  CloseIcon,
  InfoIcon,
  LocationIcon,
  MinusIcon,
  NotesIcon,
  OrderTypeIcon,
  PersonIcon,
  PhoneIcon,
  ReceiptIcon,
  RestaurantIcon,
  SendIcon,
  ShoppingCartIcon,
  TableIcon,
  WarningIcon,
} from "../components/icons";

const STEPS = [
  { label: "Tipo", Icon: RestaurantIcon },
  { label: "Datos", Icon: PersonIcon },
  { label: "Productos", Icon: ShoppingCartIcon },
  { label: "Confirmar", Icon: ReceiptIcon },
  { label: "Enviar", Icon: SendIcon },
] as const;

interface DeliveryData {
  name: string;
  address: string;
  phone: string;
}

export default function NewOrderPage({
  setHeader,
  registerBack,
  refreshOrders,
  active,
}: {
  setHeader: (h: { title: string; subtitle?: string }) => void;
  registerBack: (fn: (() => void) | null) => void;
  refreshOrders: () => Promise<void>;
  active: boolean;
}) {
  const { api, session, navigate } = useAuth();

  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<OrderTypeDTO[]>([]);
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [menu, setMenu] = useState<MenuDTO | null>(null);
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [changedType, setChangedType] = useState<OrderTypeDTO | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<DeliveryData>({ name: "", address: "", phone: "" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [noteOpenId, setNoteOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentText, setSentText] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [zoomItem, setZoomItem] = useState<MenuItemDTO | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItemDTO | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadCatalog = useCallback(async () => {
    if (!api || !session) return;
    try {
      const [menuData, typesData, tablesData, catsData] = await Promise.all([
        api.getMenu(),
        api.getOrderTypes(),
        api.getTables(),
        api.getCategories(),
      ]);
      setMenu(menuData);
      setTypes(typesData);
      setTables(tablesData);
      const flatCats = catsData.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
      setCategories(flatCats);
      setActiveCategory(
        (prev) => prev ?? flatCats[0]?.id ?? menuData.menuItems[0]?.product.productCategory.id ?? null
      );
      setOffline(false);
      setError("");
      void saveCatalog({ menu: menuData, types: typesData, tables: tablesData }).catch(() => undefined);
    } catch (e) {
      const cached = await getCachedCatalog();
      if (cached.menu) setMenu(cached.menu);
      if (cached.types?.length) setTypes(cached.types);
      if (cached.tables?.length) setTables(cached.tables);
      if (cached.menu) {
        const cats = cached.menu.menuItems
          .map((i) => i.product.productCategory)
          .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
        setCategories(cats);
        setActiveCategory((prev) => prev ?? cats[0]?.id ?? null);
      }
      setOffline(true);
      setError(e instanceof ApiError ? `Modo sin conexión: ${e.message}` : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [api, session]);

  useEffect(() => {
    if (active) void loadCatalog();
  }, [active, loadCatalog]);

  useEffect(() => {
    if (!api || !active) return;
    const timer = window.setInterval(() => void loadCatalog(), 60000);
    return () => window.clearInterval(timer);
  }, [api, active, loadCatalog]);

  useEffect(() => {
    if (step === 1 && changedType && (changedType.paramType === ORDER_CONST.DELIVERY || changedType.paramType === ORDER_CONST.CARRY)) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [step, changedType]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, it) => sum + Number(it.menuItem.price) * it.quantity, 0),
    [cart]
  );

  const visibleItems = useMemo<MenuItemDTO[]>(() => {
    if (!menu) return [];
    if (activeCategory === null) return menu.menuItems;
    return menu.menuItems.filter((it) => it.product.productCategory.id === activeCategory);
  }, [menu, activeCategory]);

  const categoryLabel = (cat: ProductCategoryDTO): string => cat.name;

  const findInCart = useCallback(
    (id: number): CartItem | undefined => cart.find((it) => it.menuItem.id === id),
    [cart]
  );

  function addItem(item: MenuItemDTO, quantity = 1, itemNotes = "") {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.menuItem.id === item.id);
      if (idx === -1) return [...prev, { menuItem: item, quantity, notes: itemNotes }];
      const copy = [...prev];
      const current = { ...copy[idx] };
      current.quantity += quantity;
      if (itemNotes && !current.notes) current.notes = itemNotes;
      copy[idx] = current;
      return copy;
    });
  }

  function setQty(id: number, qty: number) {
    setCart((prev) =>
      qty <= 0 ? prev.filter((it) => it.menuItem.id !== id) : prev.map((it) => (it.menuItem.id === id ? { ...it, quantity: qty } : it))
    );
  }

  function setItemNotes(id: number, value: string) {
    setCart((prev) => prev.map((it) => (it.menuItem.id === id ? { ...it, notes: value } : it)));
  }

  function changeType(t: OrderTypeDTO) {
    setChangedType(t);
    setSelectedTable(null);
    setDelivery({ name: "", address: "", phone: "" });
    setError("");
    if (t.paramType === ORDER_CONST.ONSITE) {
      setStep(1);
    } else {
      setStep(1);
    }
  }

  function validateStep2(): boolean {
    const t = changedType;
    if (!t) return false;
    if (t.paramType === ORDER_CONST.ONSITE) {
      if (selectedTable === null) {
        setError("Selecciona una mesa para el pedido en el local.");
        return false;
      }
    } else if (t.paramType === ORDER_CONST.DELIVERY) {
      if (!delivery.name.trim()) {
        setError("Ingresa el nombre del cliente.");
        return false;
      }
      if (!delivery.address.trim()) {
        setError("Ingresa la dirección de entrega.");
        return false;
      }
      if (!/^\s*\d{7,}\s*$/.test(delivery.phone.replace(/[\s-]/g, ""))) {
        setError("Ingresa un teléfono válido (mínimo 7 dígitos).");
        return false;
      }
    } else if (t.paramType === ORDER_CONST.CARRY) {
      if (!delivery.name.trim()) {
        setError("Ingresa el nombre del cliente.");
        return false;
      }
    }
    setError("");
    return true;
  }

  async function submit() {
    if (!api || !session || !changedType || cart.length === 0) return;
    setSending(true);
    setError("");
    const t = changedType;
    const payload = {
      customerId: 0,
      orderType: t.id,
      tableId: t.paramType === ORDER_CONST.ONSITE ? (selectedTable ?? undefined) : undefined,
      name: delivery.name.trim() || undefined,
      address: t.paramType === ORDER_CONST.DELIVERY ? delivery.address.trim() : undefined,
      phone: delivery.phone.trim() || undefined,
      notes: notes.trim() || undefined,
      userId: session.userId,
      items: cart.map((it) => ({
        menuItemId: it.menuItem.id,
        quantity: it.quantity,
        notes: it.notes.trim() || undefined,
      })),
    };
    const tableName = tables.find((tb) => tb.id === selectedTable)?.name;
    const snapshot = {
      typeName: t.name,
      typeColor: t.colorLabel || "#fb7318",
      label: t.paramType === ORDER_CONST.ONSITE ? (tableName ? `Mesa ${tableName}` : "") : delivery.name.trim(),
      itemCount: cart.reduce((s, it) => s + it.quantity, 0),
    };

    const finish = (label: string, orderNumber?: number) => {
      setSending(false);
      setSentText(label);
      if (orderNumber) setCreatedOrderNumber(orderNumber);
      window.setTimeout(() => {
        resetAll();
        setSentText(null);
        setCreatedOrderNumber(null);
        void refreshOrders();
        navigate({ name: "orders" });
      }, 7000);
    };

    try {
      const created = await api.createOrder(payload);
      finish("Pedido enviado", created.localNumber);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        navigate({ name: "login" });
        return;
      }
      if (e instanceof ApiError && e.status === 0) {
        try {
          await addPendingOrder(payload, snapshot);
        } catch {
          setError("No se pudo guardar la orden en este dispositivo.");
          setSending(false);
          return;
        }
        finish("Guardado para sincronizar");
        return;
      }
      setError(e instanceof ApiError ? e.message : "No se pudo enviar el pedido.");
      setSending(false);
    }
  }

  function next() {
    setError("");
    if (step === 0) {
      if (!changedType) {
        setError("Selecciona el tipo de pedido.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!validateStep2()) return;
      if (changedType?.paramType === ORDER_CONST.ONSITE) {
        setStep(2);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (cart.length === 0) {
        setError("Agrega al menos un producto.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      void submit();
    }
  }

  function resetAll() {
    setStep(0);
    setChangedType(null);
    setSelectedTable(null);
    setDelivery({ name: "", address: "", phone: "" });
    setCart([]);
    setNotes("");
    setError("");
  }

  useEffect(() => {
    setHeader({ title: "Nuevo pedido", subtitle: changedType?.name || "Elige el tipo de pedido" });
    registerBack(() => {
      setShowCancelConfirm(true);
    });
  }, [step, changedType, setHeader, registerBack, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col animate-fade topbar-offset">
      {offline && (
        <div className="fixed left-0 right-0 top-[calc(var(--safe-top-compact)+58px)] z-20 bg-warn/10 text-warn text-xs px-4 py-1.5 flex items-center gap-2">
          <WarningIcon className="w-4 h-4 shrink-0" />
          Catálogo guardado del dispositivo (sin conexión al servidor)
        </div>
      )}

<header className="fixed top-[calc(var(--safe-top-compact)+58px)] left-0 right-0 z-30 bg-background/98 backdrop-blur-sm border-b border-outline/50 shadow-sm">
        <div className="flex items-center px-4 pt-2 pb-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const isNext = i === step + 1;
            const C = s.Icon;
            const canAdvanceNow = (() => {
              if (step === 0) return !!changedType;
              if (step === 1) return true;
              if (step === 2) return cart.length > 0;
              if (step === 3) return true;
              return false;
            })();
            return (
              <Fragment key={s.label}>
                {i > 0 && <div className={`flex-1 h-[2px] rounded-full mb-4 ${i <= step ? "bg-primary" : "bg-outline"}`} />}
                <button
                  type="button"
                  onClick={() => {
                    if (done) setStep(i);
                    else if (isNext && canAdvanceNow) next();
                  }}
                  disabled={!done && !active && !isNext}
                  className={`flex flex-col items-center gap-1 shrink-0 ${
                    active
                      ? "text-primary"
                      : done
                        ? "text-primary cursor-pointer"
                        : isNext && canAdvanceNow
                          ? "text-primary"
                          : "text-neutral-gray cursor-not-allowed"
                  }`}
                >
<span className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors">
                    {done ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <C className="w-5 h-5" />
                    )}
                    {isNext && canAdvanceNow && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />}
                  </span>
                  <span className={`text-[10px] font-bold ${active ? "text-primary" : isNext && canAdvanceNow ? "text-primary" : "text-neutral-gray"}`}>{s.label}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </header>

      <main className={`flex-1 min-h-0 overflow-auto pb-28 ${offline ? "pt-[96px]" : "pt-[73px]"}`}>
        {error && <div className="bg-danger/10 text-danger text-sm px-4 py-3 rounded-xl mx-4 mt-4">{error}</div>}

        {step === 0 && (
          <section className="animate-fade space-y-3 px-4 pt-4">
            <h2 className="text-lg font-bold text-neutral-dark">Tipo de pedido</h2>
            {types.map((t) => {
              const selected = changedType?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => changeType(t)}
                  className={`w-full text-left bg-surface rounded-[14px] shadow-elev1 p-4 transition-all border-2 ${selected ? "border-primary" : "border-transparent"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: t.colorLabel || "#fb7318" }}>
                      <OrderTypeIcon type={t.paramType} className="w-6 h-6" />
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-dark">{t.name}</p>
                      {t.description && <p className="text-xs text-neutral-gray">{t.description}</p>}
                    </div>
                    {selected && <CheckCircleIcon className="w-6 h-6 text-primary" />}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {step === 1 && changedType && (
          <section className="animate-fade space-y-4 px-4 pt-2">
            <h2 className="text-lg font-bold text-neutral-dark">Datos del pedido</h2>
            {changedType.paramType === ORDER_CONST.ONSITE && (
              <StepOnsite
                tables={tables}
                selected={selectedTable}
                onSelect={(id) => {
                  setSelectedTable(id);
                  setError("");
                  setStep(2);
                }}
              />
            )}
            {(changedType.paramType === ORDER_CONST.DELIVERY || changedType.paramType === ORDER_CONST.CARRY) && (
              <div className="space-y-3">
                <Input
                  label="Nombre del cliente"
                  icon={<PersonIcon className="w-5 h-5" />}
                  value={delivery.name}
                  onChange={(e) => setDelivery({ ...delivery, name: e.target.value })}
                  ref={nameInputRef}
                />
                {changedType.paramType === ORDER_CONST.DELIVERY && (
                  <>
                    <Input
                      label="Dirección de entrega"
                      icon={<LocationIcon className="w-5 h-5" />}
                      value={delivery.address}
                      onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    />
                    <Input
                      label="Teléfono"
                      icon={<PhoneIcon className="w-5 h-5" />}
                      value={delivery.phone}
                      inputMode="tel"
                      placeholder="3112345678"
                      onChange={(e) => setDelivery({ ...delivery, phone: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                    />
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade space-y-4 px-4 pt-2">
            <h2 className="text-lg font-bold text-neutral-dark">Productos</h2>
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? "bg-primary text-white shadow-elev1" : "bg-secondary/10 text-secondary border border-secondary/20"}`}
                  >
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>
            )}

            {visibleItems.length === 0 ? (
              <p className="text-sm text-neutral-gray py-10 text-center">No hay productos en esta categoría.</p>
            ) : (
              <div className="space-y-2.5">
                {visibleItems.map((item) => {
                  const inCart = findInCart(item.id);
                  const img = imageUrl(api?.base ?? "", item.product.imagePath || item.product.urlImage);
                  return (
                    <div key={item.id} className="app-surface p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex-1 min-w-0 font-semibold text-neutral-dark leading-snug">
                          {item.product.name}
                        </p>
                        {item.product.description && (
                          <button
                            type="button"
                            aria-label="Ver detalle del producto"
                            onClick={() => setDetailItem(item)}
                            className="w-7 h-7 shrink-0 rounded-lg bg-surface text-neutral-gray flex items-center justify-center active:scale-95"
                          >
                            <InfoIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-end gap-3">
                        <button
                          type="button"
                          onClick={() => (img ? setZoomItem(item) : setDetailItem(item))}
                          className="shrink-0 text-left"
                        >
                          <ProductThumb src={img} alt={item.product.name} />
                          <span className="block mt-1 text-sm font-bold text-neutral-dark tabular-nums">
                            {formatMoney(item.price)}
                          </span>
                        </button>

                        <div className="flex-1" />

                        {inCart ? (
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-2 bg-background rounded-xl p-1">
                              <button onClick={() => setQty(item.id, inCart.quantity - 1)} className="w-8 h-8 rounded-lg bg-surface shadow-sm flex items-center justify-center text-neutral-dark">
                                <MinusIcon className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center font-bold text-neutral-dark">{inCart.quantity}</span>
                              <button onClick={() => setQty(item.id, inCart.quantity + 1)} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                                <AddIcon className="w-4 h-4" />
                              </button>
                            </div>
                            {noteOpenId === item.id ? (
                              <div className="w-[190px]">
                                <TextArea
                                  compact
                                  autoFocus
                                  placeholder="Nota del producto"
                                  value={inCart.notes}
                                  onChange={(e) => setItemNotes(item.id, e.target.value)}
                                  rows={1}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setNoteOpenId(item.id)}
                                className={`inline-flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1 text-xs font-bold transition-colors ${
                                  inCart.notes ? "bg-primary/12 text-primary" : "bg-surface text-neutral-gray"
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${inCart.notes ? "bg-primary text-white" : "bg-background text-neutral-gray"}`}>
                                  <NotesIcon className="w-3 h-3" />
                                </span>
                                {inCart.notes ? "Editar nota" : "Agregar nota"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem(item, 1, "")}
                            className="shrink-0 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center"
                          >
                            <AddIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="animate-fade space-y-4 px-4 pt-2">
            <h2 className="text-lg font-bold text-neutral-dark">Confirmar pedido</h2>

            <div className="app-surface overflow-hidden shadow-elev2">
              <div className="h-2 w-full" style={{ backgroundColor: changedType?.colorLabel || "#fb7318" }} />
              <div className="p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-neutral-gray">Resumen</p>
                <div className="mt-1.5">
                  <Chip color={changedType?.colorLabel || "#fb7318"}>{changedType?.name}</Chip>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-light space-y-2">
                  {changedType?.paramType === ORDER_CONST.ONSITE && selectedTable !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-gray">Mesa</span>
                      <span className="font-semibold text-neutral-dark">
                        {tables.find((t) => t.id === selectedTable)?.name}
                      </span>
                    </div>
                  )}
                  {delivery.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-gray">Cliente</span>
                      <span className="font-semibold text-neutral-dark">{delivery.name}</span>
                    </div>
                  )}
                  {delivery.address && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-gray shrink-0">Dirección</span>
                      <span className="text-sm text-neutral-dark text-right">{delivery.address}</span>
                    </div>
                  )}
                  {delivery.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-gray">Teléfono</span>
                      <span className="text-sm text-neutral-dark tabular-nums">{delivery.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="app-surface p-4 shadow-elev2">
              <h3 className="font-bold text-neutral-dark mb-1">Productos</h3>
              <p className="text-xs text-neutral-gray mb-3">Toca la nota de cada producto para editarla.</p>
              <div className="divide-y divide-neutral-light">
                {cart.map((it) => (
                  <div key={it.menuItem.id} className="py-2.5 flex items-center gap-3">
                    <ProductThumb
                      src={imageUrl(api?.base ?? "", it.menuItem.product.imagePath || it.menuItem.product.urlImage)}
                      alt={it.menuItem.product.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-dark leading-snug">{it.menuItem.product.name}</p>
                      <p className="text-sm text-neutral-gray">{formatMoney(Number(it.menuItem.price) * it.quantity)}</p>
                      {it.notes && <p className="text-xs text-neutral-gray mt-0.5">Nota: {it.notes}</p>}
                      <div className="mt-1">
                        {noteOpenId === it.menuItem.id ? (
                          <div className="w-full max-w-[240px]">
                            <TextArea
                              compact
                              autoFocus
                              placeholder="Nota del producto"
                              value={it.notes}
                              onChange={(e) => setItemNotes(it.menuItem.id, e.target.value)}
                              rows={1}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNoteOpenId(it.menuItem.id)}
                            className={`inline-flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-bold transition-colors ${
                              it.notes ? "bg-primary/12 text-primary" : "bg-surface text-neutral-gray"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center ${it.notes ? "bg-primary text-white" : "bg-background text-neutral-gray"}`}>
                              <NotesIcon className="w-2.5 h-2.5" />
                            </span>
                            {it.notes ? "Editar nota" : "Agregar nota"}
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-primary tabular-nums shrink-0">x{it.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <TextArea
                  compact
                  label="Nota de la orden (opcional)"
                  placeholder="Ej: enviar todo junto, pagar en sitio, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-neutral-gray mt-1">
                  Esta nota aplica a toda la orden, no a un producto en particular.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-light flex items-center justify-between">
                <span className="font-bold text-neutral-dark">Total</span>
                <span className="text-xl font-black text-primary">{formatMoney(cartTotal)}</span>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="animate-fade space-y-4 px-4 pt-2 pb-20">
            <h2 className="text-lg font-bold text-neutral-dark">¿Seguro que deseas enviarlo?</h2>
            <p className="text-sm text-neutral-gray">Revisa los datos y confirma el envío.</p>
            <Button
              full
              variant="secondary"
              className="shadow-xl py-4 text-base mt-4"
              onClick={next}
              disabled={sending}
            >
              {sending ? <Spinner /> : <> <SendIcon className="w-5 h-5" /> Sí, enviar </>}
            </Button>
          </section>
        )}

        {zoomItem && (
          <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col animate-fade">
            <button
              onClick={() => setZoomItem(null)}
              className="m-4 self-end w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Cerrar"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center justify-center px-4 pb-8 min-h-0">
              <img
                src={imageUrl(api?.base ?? "", zoomItem.product.imagePath || zoomItem.product.urlImage)}
                alt={zoomItem.product.name}
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            </div>
            <p className="text-center text-white font-bold pb-8 px-6">{zoomItem.product.name}</p>
          </div>
        )}

        {detailItem && (
          <Sheet open onClose={() => setDetailItem(null)}>
            <div className="flex items-start gap-3">
              <ProductThumb
                src={imageUrl(api?.base ?? "", detailItem.product.imagePath || detailItem.product.urlImage)}
                alt={detailItem.product.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-dark leading-snug">{detailItem.product.name}</p>
                <p className="text-sm font-bold text-primary mt-0.5">{formatMoney(detailItem.price)}</p>
              </div>
            </div>
            {detailItem.product.description && (
              <p className="mt-4 text-sm text-neutral-gray leading-relaxed">{detailItem.product.description}</p>
            )}
            {!detailItem.product.description && !detailItem.product.imagePath && !detailItem.product.urlImage && (
              <p className="mt-4 text-sm text-neutral-gray">Este producto no tiene detalle registrado.</p>
            )}
            <Button full variant="secondary" className="mt-6" onClick={() => setDetailItem(null)}>
              Cerrar
            </Button>
          </Sheet>
        )}

        {sentText && (
          <Sheet open={!!sentText} onClose={() => { setSentText(null); setCreatedOrderNumber(null); navigate({ name: "orders" }); }}>
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-24 h-24 rounded-full bg-success flex items-center justify-center text-white shadow-lg animate-slide-up">
                <CheckCircleIcon className="w-12 h-12" />
              </div>
              <p className="mt-5 text-xl font-black text-neutral-dark">{sentText}</p>
              {createdOrderNumber && (
                <p className="mt-2 text-base text-neutral-gray">
                  Orden #{createdOrderNumber} creada
                </p>
              )}
              {sentText !== "Pedido enviado" && (
                <p className="mt-2 text-sm text-neutral-gray">
                  Se enviará automáticamente cuando el servidor esté disponible.
                </p>
              )}
              <Button full variant="secondary" className="mt-6 max-w-xs" onClick={() => { setSentText(null); setCreatedOrderNumber(null); navigate({ name: "orders" }); }}>
                Aceptar
              </Button>
            </div>
          </Sheet>
        )}
      </main>

      {showCancelConfirm && (
        <Sheet open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)}>
          <p className="text-lg font-bold text-neutral-dark mb-4">¿Descartar el pedido actual?</p>
          <p className="text-sm text-neutral-gray mb-6">Se perderán los productos y datos ingresados.</p>
          <div className="flex gap-3">
            <Button full variant="ghost" onClick={() => setShowCancelConfirm(false)}>
              Seguir editando
            </Button>
            <Button full variant="danger" onClick={() => { setShowCancelConfirm(false); resetAll(); navigate({ name: "orders" }); }}>
              <CloseIcon className="w-5 h-5" />
              Descartar
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function StepOnsite({ tables, selected, onSelect }: { tables: TableDTO[]; selected: number | null; onSelect: (id: number) => void }) {
  return (
    <div>
      <p className="text-sm text-neutral-gray mb-2">Selecciona la mesa</p>
      <div className="grid grid-cols-2 gap-2.5">
        {tables.map((t) => {
          const occupied = t.statusTab === "OCCUPIED";
          const isSel = selected === t.id;
          const label = t.name.replace(/Mesa\s*/i, "") || t.name;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`relative flex items-center gap-3 app-surface px-3 py-3 transition-all active:scale-[0.96] ${
                isSel
                  ? "ring-2 ring-primary/40 shadow-elev2"
                  : "hover:bg-surface-container/70"
              }`}
              style={isSel ? { boxShadow: "0 8px 18px -6px rgb(255 51 15 / 0.5)" } : undefined}
            >
              {isSel && (
                <CheckCircleIcon className="absolute top-1.5 right-1.5 w-5 h-5 text-primary" />
              )}
              <span className="w-12 h-12 shrink-0 rounded-xl gradient-brand flex items-center justify-center text-white shadow-elev1 relative">
                <TableIcon className="w-7 h-7" />
                {occupied && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-danger border-2 border-white" />
                )}
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block font-black text-neutral-dark leading-tight truncate">
                  #{label}
                </span>
                <span className="block text-xs text-neutral-gray flex items-center gap-1 mt-0.5 tabular-nums">
                  <ChairIcon className="w-4 h-4" />
                  {t.seats}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {selected !== null && tables.find((t) => t.id === selected)?.statusTab === "OCCUPIED" && (
        <p className="text-xs text-warn mt-2 bg-warn/10 px-3 py-2 rounded-lg flex items-start gap-1.5">
          <WarningIcon className="w-4 h-4 shrink-0 mt-0.5" />
          La mesa seleccionada está ocupada. Confirma que es lo correcto.
        </p>
      )}
    </div>
  );
}