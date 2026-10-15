import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner, Toast } from "../components/ui";
import { Sheet } from "../components/kit";
import { ApiError } from "../lib/api";
import { getLastUser, saveLastUser } from "../lib/storage";
import { StatusBar, Style } from "@capacitor/status-bar";
import { LockIcon, LoginIcon, PersonIcon } from "../components/icons";

export default function LoginPage() {
  const { connection, session, api, doLogin, navigate, disconnect, ready } = useAuth();
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showServerConfirm, setShowServerConfirm] = useState(false);

  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Light });
  }, []);

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
    <div className="h-dvh flex flex-col overflow-y-auto animate-fade bg-background">
      <div className="hero-gradient safe-top shrink-0 min-h-[16rem] px-6 pb-10 pt-6 flex flex-col justify-end">
        <span className="self-start inline-flex items-center rounded-full bg-white/20 text-white text-xs font-bold px-3.5 py-1.5 mb-4 backdrop-blur">
          ¡Bienvenido de nuevo!
        </span>
        <div className="flex items-center gap-3">
          <img src="/logo-marca.png" alt="Meser" className="w-14 h-14 shrink-0 rounded-3xl bg-white shadow-elev2" />
          <div className="min-w-0">
            <h1 className="text-white text-3xl font-black leading-tight drop-shadow-sm truncate">
              {connection?.clientName || "Meser"}
            </h1>
            {connection && (
              <p className="text-white/75 text-xs mt-0.5 truncate">
                {connection.host}:{connection.port}
              </p>
            )}
          </div>
        </div>
        <p className="text-white/90 text-sm mt-4">
          Inicia sesión y sigue atendiendo tus comandas con alegría.
        </p>
      </div>
      <div className="bg-surface rounded-t-[28px] -mt-6 flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-6 shadow-elev3 flex flex-col" style={{ paddingBottom: "min(max(var(--safe-bottom), 20px), 40px)" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-gray">Ingreso con</span>
            <div className="flex bg-surface-container rounded-full p-1">
              <button
                type="button"
                onClick={() => setMode("pin")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === "pin" ? "gradient-brand text-white" : "text-neutral-gray"}`}
              >
                PIN
              </button>
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === "password" ? "gradient-brand text-white" : "text-neutral-gray"}`}
              >
                Contraseña
              </button>
            </div>
          </div>
          <Input
            label="Usuario"
            icon={<PersonIcon className="w-5 h-5" />}
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Input
            label={mode === "pin" ? "PIN" : "Contraseña"}
            icon={<LockIcon className="w-5 h-5" />}
            type="password"
            inputMode={mode === "pin" ? "numeric" : undefined}
            placeholder={mode === "pin" ? "••••" : "••••••••"}
            value={secret}
            onChange={(e) => setSecret(mode === "pin" ? e.target.value.replace(/\D/g, "") : e.target.value)}
          />
          <Button full type="submit" disabled={busy || !ready || !api}>
            {busy ? <Spinner /> : (
              <>
                <LoginIcon className="w-5 h-5" />
                Entrar
              </>
            )}
          </Button>
        </form>
        {session && !session.changePin && (
          <p className="text-center text-xs text-neutral-gray mt-4">
            Sesión activa como {session.name || session.username}
          </p>
        )}
        <div className="mt-auto pt-5">
          <div className="border-t border-outline/70 pt-4">
            <button
              type="button"
              onClick={() => setShowServerConfirm(true)}
              className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors"
            >
              Cambiar de servidor
            </button>
          </div>
        </div>
      </div>
      {error && <Toast type="error" message={error} onDismiss={() => setError("")} />}
      {showServerConfirm && (
        <Sheet open={showServerConfirm} onClose={() => setShowServerConfirm(false)}>
          <p className="text-lg font-bold text-neutral-dark mb-4">¿Cambiar de servidor?</p>
          <p className="text-sm text-neutral-gray mb-6">Se cerrará la sesión actual y volverás a la pantalla de conexión.</p>
          <div className="flex gap-3">
            <Button full variant="ghost" onClick={() => setShowServerConfirm(false)}>
              No, quedarme
            </Button>
            <Button full variant="danger" onClick={() => { setShowServerConfirm(false); disconnect(); }}>
              Sí, cambiar
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}