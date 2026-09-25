import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MenuDTO, OrderTypeDTO, TableDTO } from "./types";

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
}

const DB_NAME = "meser-catalog";
const DB_VERSION = 1;

function dbOpen(): Promise<IDBPDatabase<MeserDBSchema>> {
  return openDB<MeserDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("menu")) db.createObjectStore("menu");
      if (!db.objectStoreNames.contains("order-types")) db.createObjectStore("order-types");
      if (!db.objectStoreNames.contains("tables")) db.createObjectStore("tables");
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