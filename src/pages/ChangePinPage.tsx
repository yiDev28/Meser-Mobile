import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner } from "../components/ui";
import { ApiError } from "../lib/api";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function ChangePinPage() {
  const { session, doChangePin, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Light });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      setError("El PIN debe tener entre 4 y 8 dígitos.");
      return;
    }
    if (pin !== confirm) {
      setError("Los PIN no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await doChangePin(pin);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el PIN.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="h-dvh flex flex-col overflow-y-auto animate-fade bg-background">
      <div className="hero-gradient safe-top shrink-0 min-h-[15rem] px-6 pb-10 pt-6 flex flex-col justify-end">
        <span className="self-start inline-flex items-center rounded-full bg-white/20 text-white text-xs font-bold px-3.5 py-1.5 mb-4 backdrop-blur">
          Primer paso
        </span>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-3xl bg-white text-primary flex items-center justify-center text-2xl font-black shadow-elev2">
            PIN
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-3xl font-black leading-tight drop-shadow-sm">Configura tu PIN</h1>
            <p className="text-white/75 text-xs mt-0.5">
              {session?.name || session?.username}
            </p>
          </div>
        </div>
        <p className="text-white/90 text-sm mt-4">
          Creaste tu cuenta por primera vez. Elige un PIN de 4 a 8 dígitos para entrar rápido cada día.
        </p>
      </div>
      <div className="bg-surface rounded-t-[28px] -mt-6 shrink-0 px-6 pt-6 pb-6 shadow-elev3 space-y-4" style={{ paddingBottom: "min(max(var(--safe-bottom), 24px), 40px)" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nuevo PIN (4 a 8 dígitos)"
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            label="Confirmar PIN"
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          />
          {error && (
            <div className="bg-danger-container/40 text-danger text-sm px-4 py-3 rounded-2xl">{error}</div>
          )}
          <Button full type="submit" disabled={busy}>
            {busy ? <Spinner /> : "Guardar PIN"}
          </Button>
        </form>
        <div className="border-t border-outline/70 pt-3">
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors"
          >
            Cancelar y cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}