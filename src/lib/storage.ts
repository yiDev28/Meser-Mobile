import { Preferences } from "@capacitor/preferences";
import type { ConnectionInfo, SessionUser } from "./types";

const KEY_CONNECTION = "meser.connection";
const KEY_SESSION = "meser.session";
const KEY_LAST_USER = "meser.lastUser";

export interface StoredConnection {
  host: string;
  port: number;
  clientId: string;
  clientName: string;
}

export async function getConnection(): Promise<StoredConnection | null> {
  const { value } = await Preferences.get({ key: KEY_CONNECTION });
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredConnection;
  } catch {
    return null;
  }
}

export async function saveConnection(conn: StoredConnection): Promise<void> {
  await Preferences.set({ key: KEY_CONNECTION, value: JSON.stringify(conn) });
}

export async function saveConnectionFromInfo(info: ConnectionInfo): Promise<void> {
  await saveConnection({
    host: info.host || info.hosts?.[0] || "localhost",
    port: info.port,
    clientId: info.clientId ?? "",
    clientName: info.clientName ?? "",
  });
}

export async function clearConnection(): Promise<void> {
  await Preferences.remove({ key: KEY_CONNECTION });
}

export async function getSession(): Promise<SessionUser | null> {
  const { value } = await Preferences.get({ key: KEY_SESSION });
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionUser): Promise<void> {
  await Preferences.set({ key: KEY_SESSION, value: JSON.stringify(session) });
}

export async function clearSession(): Promise<void> {
  await Preferences.remove({ key: KEY_SESSION });
}

export async function getLastUser(): Promise<string> {
  const { value } = await Preferences.get({ key: KEY_LAST_USER });
  return value ?? "";
}

export async function saveLastUser(username: string): Promise<void> {
  await Preferences.set({ key: KEY_LAST_USER, value: username });
}