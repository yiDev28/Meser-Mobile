import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner, Toast } from "../components/ui";
import { ApiError } from "../lib/api";
import { getLastUser, saveLastUser } from "../lib/storage";

export default function LoginPage() {
  const { connection, session, api, doLogin, navigate, disconnect, ready } = useAuth();
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getLastUser().then((u) => {
      if (u) setUsername(u);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Ingresa tu usuario.");
      return;
    }
    if (!secret) {
      setError(mode === "pin" ? "Ingresa tu PIN." : "Ingresa tu contraseña.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await doLogin(username.trim(), secret, mode);
      void saveLastUser(username.trim());
      if (user.changePin) navigate({ name: "change-pin" });
      else navigate({ name: "home" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden animate-fade bg-background">
      <div className="flex flex-col items-center pt-12 pb-6 px-6 shrink-0">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-black mb-4 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-neutral-dark">Iniciar sesión</h1>
        {connection && (
          <p className="text-sm text-neutral-gray mt-1 text-center">
            {connection.clientName} · {connection.host}:{connection.port}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4 animate-slide-up">
          <Input
            label="Usuario"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />

          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-medium text-neutral-gray">Modo</span>
              <div className="flex bg-background rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMode("pin")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === "pin" ? "bg-primary text-white" : "text-neutral-gray"}`}
                >
                  PIN
                </button>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === "password" ? "bg-primary text-white" : "text-neutral-gray"}`}
                >
                  Contraseña
                </button>
              </div>
            </div>
            <Input
              label={mode === "pin" ? "PIN" : "Contraseña"}
              type="password"
              inputMode={mode === "pin" ? "numeric" : undefined}
              placeholder={mode === "pin" ? "••••" : "••••••••"}
              value={secret}
              onChange={(e) => setSecret(mode === "pin" ? e.target.value.replace(/\D/g, "") : e.target.value)}
            />
          </div>

          <Button full type="submit" disabled={busy || !ready || !api}>
            {busy ? <Spinner /> : "Entrar"}
          </Button>
        </div>

        {session && !session.changePin && (
          <p className="text-center text-xs text-neutral-gray mt-4">
            Sesión activa como {session.name || session.username}
          </p>
        )}
      </form>

      <div className="shrink-0 border-t border-neutral-light bg-surface px-6 py-3">
        <button
          type="button"
          onClick={disconnect}
          className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors"
        >
          Cambiar de servidor
        </button>
      </div>

      {error && <Toast type="error" message={error} onDismiss={() => setError("")} />}
    </div>
  );
}