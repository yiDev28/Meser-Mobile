import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner } from "../components/ui";
import { ApiError } from "../lib/api";

export default function ChangePinPage() {
  const { session, doChangePin, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex flex-col animate-fade">
      <div className="flex flex-col items-center pt-14 pb-8 px-6">
        <div className="w-16 h-16 rounded-2xl bg-tertiary flex items-center justify-center text-neutral-dark text-2xl font-black mb-4">
          PIN
        </div>
        <h1 className="text-2xl font-bold text-neutral-dark">Configura tu PIN</h1>
        <p className="text-sm text-neutral-gray mt-1 text-center">
          {session?.name || session?.username}, es la primera vez que inicias sesión
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 pb-10">
        <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4 animate-slide-up">
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

          {error && <div className="bg-danger/10 text-danger text-sm px-3 py-2 rounded-lg">{error}</div>}

          <Button full type="submit" disabled={busy}>
            {busy ? <Spinner /> : "Guardar PIN"}
          </Button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors"
          >
            Cancelar y cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}