import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "../lib/api";
import {
  clearSession,
  getConnection,
  getSession,
  saveConnection,
  saveSession,
  type StoredConnection,
} from "../lib/storage";
import type { SessionUser } from "../lib/types";

export type Screen =
  | { name: "connect" }
  | { name: "home" }
  | { name: "orders" }
  | { name: "new-order" }
  | { name: "order-detail"; orderId: string }
  | { name: "login" }
  | { name: "change-pin" };

interface AuthContextValue {
  connection: StoredConnection | null;
  session: SessionUser | null;
  api: ApiClient | null;
  screen: Screen;
  navigate: (screen: Screen) => void;
  ready: boolean;
  connect: (conn: StoredConnection) => Promise<void>;
  disconnect: () => void;
  doLogin: (
    username: string,
    pin: string,
    mode: "pin" | "password"
  ) => Promise<SessionUser>;
  doChangePin: (newPin: string) => Promise<void>;
  logout: () => void;
  refreshSession: (session: SessionUser) => void;
  notice: AppNotice | null;
  notify: (notice: AppNotice) => void;
  clearNotice: () => void;
}

export interface AppNotice {
  type: "success" | "error" | "info";
  message: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<StoredConnection | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const notify = useCallback((next: AppNotice) => {
    setNotice(next);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const clearNotice = useCallback(() => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setNotice(null);
  }, []);

  const api = useMemo<ApiClient | null>(() => {
    if (!connection) return null;
    return new ApiClient(`http://${connection.host}:${connection.port}/api`);
  }, [connection?.host, connection?.port]);

  useEffect(() => {
    (async () => {
      const conn = await getConnection();
      const sess = await getSession();
      if (conn) setConnection(conn);
      if (sess) setSession(sess);
      setReady(true);
      if (!conn) setScreen({ name: "connect" });
      else if (!sess) setScreen({ name: "login" });
      else setScreen({ name: "home" });
    })();
  }, []);

  useEffect(() => {
    api?.setToken(session?.token ?? null);
  }, [api, session]);

  const navigate = useCallback((next: Screen) => {
    setScreen(next);
    window.scrollTo(0, 0);
  }, []);

  const connect = useCallback(
    async (conn: StoredConnection) => {
      await saveConnection(conn);
      setConnection(conn);
      setSession(null);
      await clearSession();
      setScreen({ name: "login" });
      notify({
        type: "success",
        message: `¡Bienvenido a ${conn.clientName || "Meser"}!`,
      });
    },
    [notify]
  );

  const disconnect = useCallback(() => {
    setConnection(null);
    setSession(null);
    setScreen({ name: "connect" });
    void clearSession();
  }, []);

  const doLogin = useCallback(
    async (
      username: string,
      pin: string,
      mode: "pin" | "password"
    ): Promise<SessionUser> => {
      if (!connection || !api) throw new Error("Sin conexión configurada");
      let idClient = connection.clientId;
      if (!idClient) {
        const info = await api.getInfo();
        idClient = info.clientId ?? "";
        if (info.clientId || info.clientName) {
          const updated: StoredConnection = {
            host: connection.host,
            port: connection.port,
            clientId: idClient,
            clientName: info.clientName ?? connection.clientName,
          };
          await saveConnection(updated);
          setConnection(updated);
        }
      }
      const user = await api.login({
        idClient,
        userClient: username,
        passClient: pin,
        pin: mode === "pin" ? pin : undefined,
        mode,
      });
      api.setToken(user.token);
      await saveSession(user);
      setSession(user);
      return user;
    },
    [connection, api]
  );

  const doChangePin = useCallback(
    async (newPin: string) => {
      if (!api || !session) return;
      api.setToken(session.token);
      await api.changePin(session.userId, newPin);
      const updated: SessionUser = { ...session, changePin: false };
      await saveSession(updated);
      setSession(updated);
      setScreen({ name: "home" });
    },
    [api, session]
  );

  const logout = useCallback(() => {
    setSession(null);
    setScreen({ name: "login" });
    void clearSession();
  }, []);

  const refreshSession = useCallback((next: SessionUser) => {
    setSession(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      connection,
      session,
      api,
      screen,
      navigate,
      ready,
      connect,
      disconnect,
      doLogin,
      doChangePin,
      logout,
      refreshSession,
      notice,
      notify,
      clearNotice,
    }),
    [connection, session, api, screen, navigate, ready, connect, disconnect, doLogin, doChangePin, logout, refreshSession, notice, notify, clearNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}