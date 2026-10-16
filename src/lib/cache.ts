import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CreateOrderDTO, MenuDTO, OrderDTO, OrderTypeDTO, TableDTO } from "./types";

export interface PendingOrderSnapshot {
  typeName: string;
  typeColor: string;
  label: string;
  itemCount: number;
}

export interface PendingOrder {
  localId: string;
  payload: CreateOrderDTO;
  createdAt: number;
  attempts: number;
  error?: string;
  snapshot?: PendingOrderSnapshot;
}

interface MeserDBSchema extends DBSchema {
  meta: {
    key: string;
    value: { updatedAt: number };
  };
  menu: {
    key: string;
    value: MenuDTO;
  };
  "order-types": {
    key: string;
    value: OrderTypeDTO[];
  };
  tables: {
    key: string;
    value: TableDTO[];
  };
  "pending-orders": {
    key: string;
    value: PendingOrder;
  };
  orders: {
    key: string;
    value: { updatedAt: number; orders: OrderDTO[] };
  };
  "product-stats": {
    key: string;
    value: { counts: Record<string, number>; updatedAt: number };
  };
}

const DB_NAME = "meser-catalog";
const DB_VERSION = 4;

function dbOpen(): Promise<IDBPDatabase<MeserDBSchema>> {
  return openDB<MeserDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("menu")) db.createObjectStore("menu");
      if (!db.objectStoreNames.contains("order-types")) db.createObjectStore("order-types");
      if (!db.objectStoreNames.contains("tables")) db.createObjectStore("tables");
      if (!db.objectStoreNames.contains("pending-orders")) db.createObjectStore("pending-orders");
      if (!db.objectStoreNames.contains("orders")) db.createObjectStore("orders");
      if (!db.objectStoreNames.contains("product-stats")) db.createObjectStore("product-stats");
    },
  });
}

async function getFromStore<K extends keyof MeserDBSchema>(
  store: K,
  key: string
): Promise<MeserDBSchema[K]["value"] | undefined> {
  const db = await dbOpen();
  try {
    return (await db.get(store as "menu" | "meta" | "order-types" | "tables", key)) as
      | MeserDBSchema[K]["value"]
      | undefined;
  } finally {
    db.close();
  }
}

export async function getCachedCatalog(): Promise<{
  menu: MenuDTO | null;
  types: OrderTypeDTO[] | null;
  tables: TableDTO[] | null;
  recent: boolean;
}> {
  const [menu, types, tables, meta] = await Promise.all([
    getFromStore("menu", "current"),
    getFromStore("order-types", "current"),
    getFromStore("tables", "current"),
    getFromStore("meta", "updatedAt"),
  ]);
  const recent = !!meta && Date.now() - meta.updatedAt < 24 * 60 * 60 * 1000;
  return {
    menu: menu ?? null,
    types: types ?? null,
    tables: tables ?? null,
    recent,
  };
}

export async function saveCatalog(data: {
  menu: MenuDTO;
  types: OrderTypeDTO[];
  tables: TableDTO[];
}): Promise<void> {
  const db = await dbOpen();
  try {
    const tx = db.transaction(["meta", "menu", "order-types", "tables"], "readwrite");
    await tx.objectStore("menu").put(data.menu, "current");
    await tx.objectStore("order-types").put(data.types, "current");
    await tx.objectStore("tables").put(data.tables, "current");
    await tx.objectStore("meta").put({ updatedAt: Date.now() }, "updatedAt");
    await tx.done;
  } finally {
    db.close();
  }
}

export async function saveOrders(ordersCached: OrderDTO[]): Promise<void> {
  const db = await dbOpen();
  try {
    await db.put("orders", { updatedAt: Date.now(), orders: ordersCached }, "current");
  } finally {
    db.close();
  }
}

export async function getCachedOrders(): Promise<{ updatedAt: number; orders: OrderDTO[] } | null> {
  const db = await dbOpen();
  try {
    return (await db.get("orders", "current")) ?? null;
  } finally {
    db.close();
  }
}

export async function addPendingOrder(
  payload: CreateOrderDTO,
  snapshot?: PendingOrderSnapshot,
  localId?: string
): Promise<PendingOrder> {
  const db = await dbOpen();
  try {
    const rec: PendingOrder = {
      localId: localId ?? crypto.randomUUID(),
      payload,
      createdAt: Date.now(),
      attempts: 0,
      snapshot,
    };
    await db.put("pending-orders", rec, rec.localId);
    return rec;
  } finally {
    db.close();
  }
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const db = await dbOpen();
  try {
    const all = await db.getAll("pending-orders");
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    db.close();
  }
}

export async function removePendingOrder(localId: string): Promise<void> {
  const db = await dbOpen();
  try {
    await db.delete("pending-orders", localId);
  } finally {
    db.close();
  }
}

export async function getPopularCounts(): Promise<Record<string, number>> {
  const db = await dbOpen();
  try {
    const rec = await db.get("product-stats", "counts");
    return rec?.counts ?? {};
  } finally {
    db.close();
  }
}

export async function recordPopular(items: { id: number; qty: number }[]): Promise<void> {
  if (items.length === 0) return;
  const db = await dbOpen();
  try {
    const rec = (await db.get("product-stats", "counts")) ?? { counts: {}, updatedAt: 0 };
    for (const it of items) {
      const key = String(it.id);
      rec.counts[key] = (rec.counts[key] ?? 0) + it.qty;
    }
    rec.updatedAt = Date.now();
    await db.put("product-stats", rec, "counts");
  } finally {
    db.close();
  }
}

export async function updatePendingOrderError(localId: string, error: string): Promise<PendingOrder | undefined> {
  const db = await dbOpen();
  try {
    const rec = await db.get("pending-orders", localId);
    if (rec) {
      rec.error = error;
      rec.attempts += 1;
      rec.createdAt = Date.now();
      await db.put("pending-orders", rec, localId);
    }
    return rec;
  } finally {
    db.close();
  }
}