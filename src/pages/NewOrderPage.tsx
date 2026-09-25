import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
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
import { Button, Chip, Input, Spinner, TextArea, formatMoney } from "../components/ui";

const TOTAL_STEPS = 4;

interface DeliveryData {
  name: string;
  address: string;
  phone: string;
}

export default function NewOrderPage() {
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
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!api || !session) return;
      try {
        const [menuData, typesData, tablesData, catsData] = await Promise.all([
          api.getMenu(),
          api.getOrderTypes(),
          api.getTables(),
          api.getCategories(),
        ]);
        if (!mounted) return;
        setMenu(menuData);
        setTypes(typesData);
        setTables(tablesData);
        const flatCats = catsData.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
        setCategories(flatCats);
        const firstCat = flatCats[0]?.id ?? menuData.menuItems[0]?.product.productCategory.id ?? null;
        setActiveCategory(firstCat);
        setOffline(false);
        void saveCatalog({ menu: menuData, types: typesData, tables: tablesData }).catch(() => undefined);
      } catch (e) {
        if (!mounted) return;
        const cached = await getCachedCatalog();
        if (cached.menu) setMenu(cached.menu);
        if (cached.types?.length) setTypes(cached.types);
        if (cached.tables?.length) setTables(cached.tables);
        if (cached.menu) {
          const c = cached.menu.menuItems[0]?.product.productCategory.id ?? null;
          setCategories(cached.menu.menuItems
            .map((i) => i.product.productCategory)
            .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx));
          setActiveCategory(c);
        }
        setOffline(true);
        setError(e instanceof ApiError ? `Modo sin conexión: ${e.message}` : "No se pudo cargar el catálogo.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api, session]);

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

  function removeItem(id: number) {
    setCart((prev) => prev.filter((it) => it.menuItem.id !== id));
  }

  function changeType(t: OrderTypeDTO) {
    setChangedType(t);
    setSelectedTable(null);
    setDelivery({ name: "", address: "", phone: "" });
    setError("");
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
    try {
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
      const created = await api.createOrder(payload);
      setSent(true);
      window.setTimeout(() => {
        navigate({ name: "order-detail", orderId: created.id });
      }, 900);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        navigate({ name: "login" });
      } else {
        setError(e instanceof ApiError ? e.message : "No se pudo enviar el pedido.");
        setSending(false);
      }
    }
  }

  function next() {
    setError("");
    if (step === 0) {
      if (!changedType) {
        setError("Selecciona el tipo de pedido.");
        return;
      }
    }
    if (step === 1 && !validateStep2()) return;
    if (step === 2 && cart.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (step === TOTAL_STEPS - 1) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    if (step === 0) {
      navigate({ name: "home" });
      return;
    }
    setStep((s) => s - 1);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col animate-fade pb-28">
      <header className="bg-surface border-b border-neutral-light sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <button onClick={back} className="text-neutral-gray hover:text-primary transition-colors" aria-label="Volver">
          ←
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-primary w-6" : "bg-neutral-light w-3"}`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-neutral-gray">{step + 1}/{TOTAL_STEPS}</span>
      </header>

      {offline && (
        <div className="bg-warn/10 text-warn text-xs px-4 py-2 flex items-center gap-2">
          ⚠️ Catálogo guardado del dispositivo (sin conexión al servidor)
        </div>
      )}

      <main className="flex-1 px-4 py-4">
        {step === 0 && (
          <section className="animate-fade space-y-3">
            <h2 className="text-lg font-bold text-neutral-dark">Tipo de pedido</h2>
            {types.map((t) => {
              const selected = changedType?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => changeType(t)}
                  className={`w-full text-left bg-surface rounded-2xl shadow-sm p-4 transition-all border-2 ${selected ? "border-primary" : "border-transparent"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black"
                      style={{ backgroundColor: t.colorLabel || "#fb7318" }}>
                      {t.paramType === ORDER_CONST.ONSITE ? "🪑" : t.paramType === ORDER_CONST.DELIVERY ? "🛵" : "🥡"}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-dark">{t.name}</p>
                      {t.description && <p className="text-xs text-neutral-gray">{t.description}</p>}
                    </div>
                    {selected && <span className="text-primary text-xl">✓</span>}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {step === 1 && changedType && (
          <section className="animate-fade space-y-4">
            <h2 className="text-lg font-bold text-neutral-dark">Datos del pedido</h2>
            {changedType.paramType === ORDER_CONST.ONSITE && (
              <StepOnsite
                tables={tables}
                selected={selectedTable}
                onSelect={setSelectedTable}
              />
            )}
            {(changedType.paramType === ORDER_CONST.DELIVERY || changedType.paramType === ORDER_CONST.CARRY) && (
              <div className="space-y-3">
                <Input
                  label="Nombre del cliente"
                  value={delivery.name}
                  onChange={(e) => setDelivery({ ...delivery, name: e.target.value })}
                />
                {changedType.paramType === ORDER_CONST.DELIVERY && (
                  <>
                    <Input
                      label="Dirección de entrega"
                      value={delivery.address}
                      onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    />
                    <Input
                      label="Teléfono"
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
          <section className="animate-fade space-y-4">
            <h2 className="text-lg font-bold text-neutral-dark">Productos</h2>
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? "bg-primary text-white" : "bg-surface text-neutral-gray border border-neutral-light"}`}
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
                  return (
                    <div key={item.id} className="bg-surface rounded-2xl shadow-sm p-3.5">
                      <div className="flex items-center gap-3">
                        {item.product.imagePath || item.product.productCategory.imagePath ? (
                          <img
                            src={imageUrl(api?.base ?? "", item.product.imagePath || item.product.productCategory.imagePath)}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-xl object-cover bg-background"
                          />
                        ) : (
                          <span className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-xl">🍽️</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-dark truncate">{item.product.name}</p>
                          <p className="text-sm text-neutral-gray">{formatMoney(item.price)}</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-background rounded-xl p-1">
                            <button onClick={() => setQty(item.id, inCart.quantity - 1)} className="w-8 h-8 rounded-lg bg-surface shadow-sm font-bold text-neutral-dark">−</button>
                            <span className="w-6 text-center font-bold text-neutral-dark">{inCart.quantity}</span>
                            <button onClick={() => setQty(item.id, inCart.quantity + 1)} className="w-8 h-8 rounded-lg bg-primary text-white font-bold">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem(item, 1, "")}
                            className="px-4 py-2 rounded-full bg-primary text-white text-sm font-bold"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {inCart && (
                        <div className="mt-2 pl-0">
                          <TextArea
                            placeholder="Nota para este producto (opcional)"
                            value={inCart.notes}
                            onChange={(e) => setItemNotes(item.id, e.target.value)}
                            rows={1}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="animate-fade space-y-4">
            <h2 className="text-lg font-bold text-neutral-dark">Resumen del pedido</h2>

            <div className="bg-surface rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-gray">Tipo</span>
                <Chip color={changedType?.colorLabel || "#f9cb43"}>{changedType?.name}</Chip>
              </div>
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
                  <span className="text-sm text-neutral-gray">Dirección</span>
                  <span className="text-sm text-neutral-dark">{delivery.address}</span>
                </div>
              )}
              {delivery.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-gray">Teléfono</span>
                  <span className="text-sm text-neutral-dark">{delivery.phone}</span>
                </div>
              )}
            </div>

            <div className="bg-surface rounded-2xl shadow-sm p-4">
              <div className="divide-y divide-neutral-light">
                {cart.map((it) => (
                  <div key={it.menuItem.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-dark truncate">{it.menuItem.product.name}</p>
                        <p className="text-sm text-neutral-gray">{formatMoney(Number(it.menuItem.price) * it.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-xl p-1">
                        <button onClick={() => setQty(it.menuItem.id, it.quantity - 1)} className="w-8 h-8 rounded-lg bg-surface shadow-sm font-bold text-neutral-dark">−</button>
                        <span className="w-6 text-center font-bold text-neutral-dark">{it.quantity}</span>
                        <button onClick={() => setQty(it.menuItem.id, it.quantity + 1)} className="w-8 h-8 rounded-lg bg-primary text-white font-bold">+</button>
                      </div>
                      <button onClick={() => removeItem(it.menuItem.id)} className="text-neutral-gray px-1" aria-label="Quitar">
                        🗑️
                      </button>
                    </div>
                    <TextArea
                      className="mt-2"
                      placeholder="Nota del producto"
                      value={it.notes}
                      onChange={(e) => setItemNotes(it.menuItem.id, e.target.value)}
                      rows={1}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-3 border-t border-neutral-light">
                <TextArea
                  label="Nota general de la orden (opcional)"
                  placeholder="Ej: sin azúcar, ingredientes aparte..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-light">
                <span className="font-bold text-neutral-dark">Total</span>
                <span className="text-xl font-black text-primary">{formatMoney(cartTotal)}</span>
              </div>
            </div>
          </section>
        )}

        {error && <div className="bg-danger/10 text-danger text-sm px-4 py-3 rounded-xl mt-4">{error}</div>}

        {sent && (
          <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center text-white text-4xl shadow-lg animate-slide-up">✓</div>
            <p className="mt-4 font-bold text-neutral-dark animate-fade">Pedido enviado</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-20">
        <Button
          full
          variant={step === TOTAL_STEPS - 1 ? "secondary" : "primary"}
          className="shadow-xl py-4 text-base"
          onClick={next}
          disabled={sending}
        >
          {sending ? <Spinner /> : step === TOTAL_STEPS - 1 ? "Enviar pedido" : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}

function StepOnsite({ tables, selected, onSelect }: { tables: TableDTO[]; selected: number | null; onSelect: (id: number) => void }) {
  return (
    <div>
      <p className="text-sm text-neutral-gray mb-2">Selecciona la mesa</p>
      <div className="grid grid-cols-4 gap-2">
        {tables.map((t) => {
          const occupied = t.statusTab === "OCCUPIED";
          const isSel = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center leading-tight transition-all border-2 ${
                isSel ? "border-primary bg-primary text-white" : occupied ? "border-danger/40 bg-danger/10 text-danger" : "border-neutral-light bg-surface text-neutral-dark"
              }`}
            >
              <span className="text-lg font-black">{t.name.replace(/Mesa\s*/i, "") || t.name}</span>
              <span className="text-[10px]">{t.seats} p</span>
            </button>
          );
        })}
      </div>
      {selected !== null && tables.find((t) => t.id === selected)?.statusTab === "OCCUPIED" && (
        <p className="text-xs text-warn mt-2 bg-warn/10 px-3 py-2 rounded-lg">
          ⚠️ La mesa seleccionada está ocupada. Confirma que es lo correcto.
        </p>
      )}
    </div>
  );
}