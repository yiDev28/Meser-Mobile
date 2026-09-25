import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App } from "@capacitor/app";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { ApiClient, ApiError } from "../lib/api";
import type { QrPayload } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner, Toast } from "../components/ui";

export default function ConnectPage() {
  const { connect } = useAuth();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("3457");
  const [nit, setNit] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<{ clientName: string; clientId: string } | null>(null);
  const closeScanRef = useRef<() => Promise<void>>(async () => undefined);

  async function stopAndClose(): Promise<void> {
    await closeScanRef.current();
  }

  useEffect(() => {
    return () => {
      document.body.classList.remove("barcode-scanner-active");
      void BarcodeScanner.stopScan().catch(() => undefined);
    };
  }, []);

  function tryConnect(hostV: string, portV: string): ApiClient {
    if (!hostV.trim()) throw new ApiError("Ingresa la IP del computador con el sistema.");
    const parsedPort = Number(portV);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      throw new ApiError("El puerto no es válido.");
    }
    return new ApiClient(`http://${hostV.trim()}:${parsedPort}/api`);
  }

  async function handleCheck(): Promise<void> {
    setBusy(true);
    setError("");
    setChecked(null);
    try {
      const api = tryConnect(host, port);
      const info = await api.getInfo();
      if (!info.clientId) {
        throw new ApiError(
          `Conectado a ${info.hosts.join(", ")} pero el sistema aún no registra un cliente en esta PC.`
        );
      }
      const testedHost = info.host || host.trim();
      setHost(testedHost);
      setChecked({ clientId: info.clientId, clientName: info.clientName ?? "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function handleValidateAndConnect(): Promise<void> {
    if (!nit.trim()) {
      setError("Ingresa el NIT del cliente.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const api = tryConnect(host, port);
      const validated = await api.validateNIT(nit.trim());
      await connect({
        host: host.trim(),
        port: Number(port),
        clientId: validated.idCliente,
        clientName: validated.name,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo validar el NIT.");
    } finally {
      setBusy(false);
    }
  }

  async function handleScan(): Promise<void> {
    setError("");
    setScanning(true);
    try {
      const supported = await BarcodeScanner.isSupported();
      if (!supported.supported) {
        setError("El escáner no está disponible en este dispositivo.");
        setScanning(false);
        return;
      }
      const perms = await BarcodeScanner.checkPermissions();
      if (perms.camera !== "granted") {
        const req = await BarcodeScanner.requestPermissions();
        if (req.camera !== "granted") {
          setError("Se necesita el permiso de cámara para escanear el QR.");
          setScanning(false);
          return;
        }
      }

      document.body.classList.add("barcode-scanner-active");
      const listener = await BarcodeScanner.addListener("barcodesScanned", (event) => {
        const raw = event.barcodes[0]?.rawValue;
        void (async () => {
          await stopAndClose();
          if (!raw) {
            setError("No se leyó ningún código QR.");
            return;
          }
          try {
            const payload = JSON.parse(raw) as QrPayload;
            if (payload.v !== 1 || !payload.host) throw new Error("bad-qr");
            setHost(payload.host);
            setPort(String(payload.port));
            await connect({
              host: payload.host,
              port: payload.port,
              clientId: payload.clientId ?? "",
              clientName: payload.clientName ?? "",
            });
          } catch {
            setError("El QR no es de conexión de Meser.");
          }
        })();
      });

      const backHandler = await App.addListener("backButton", () => {
        void stopAndClose();
      });

      closeScanRef.current = async () => {
        await backHandler.remove().catch(() => undefined);
        await listener.remove().catch(() => undefined);
        await BarcodeScanner.stopScan().catch(() => undefined);
        document.body.classList.remove("barcode-scanner-active");
        setScanning(false);
      };

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] });
    } catch (e) {
      document.body.classList.remove("barcode-scanner-active");
      setScanning(false);
      setError(e instanceof ApiError ? e.message : "No se pudo iniciar el escáner.");
    }
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden animate-fade bg-background">
      <div className="flex flex-col items-center pt-12 pb-6 px-6 shrink-0">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-black mb-4 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-neutral-dark">Meser Mobile</h1>
        <p className="text-sm text-neutral-gray mt-1 text-center">
          Conecta este dispositivo al sistema Meser
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="bg-surface rounded-2xl shadow-sm p-5 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-semibold text-neutral-dark">Prueba la conexión</span>
          </div>
          <Input
            label="Dirección IP del computador"
            placeholder="192.168.1.10"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            inputMode="numeric"
            autoCapitalize="none"
          />
          <Input
            label="Puerto"
            placeholder="3457"
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
          <Button full onClick={handleCheck} disabled={busy || scanning}>
            {busy ? <Spinner /> : null}
            Probar conexión
          </Button>
          {checked && (
            <p className="text-sm text-neutral-dark bg-success/10 text-success px-3 py-2 rounded-lg">
              Conectado a: {checked.clientName || checked.clientId}
            </p>
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5 mt-4 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
            <span className="text-sm font-semibold text-neutral-dark">Valida el NIT</span>
          </div>
          <Input
            label="NIT del restaurante"
            placeholder="900123456"
            value={nit}
            onChange={(e) => setNit(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
          <Button full variant="secondary" onClick={handleValidateAndConnect} disabled={busy || scanning}>
            {busy ? <Spinner /> : null}
            Conectar y validar
          </Button>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-5 mt-4 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</span>
            <span className="text-sm font-semibold text-neutral-dark">Escanea el QR</span>
          </div>
          <p className="text-xs text-neutral-gray">
            En el computador abre Configuración → "Conectar dispositivo" y escanea el código QR.
          </p>
          <Button full variant="outline" onClick={handleScan} disabled={busy || scanning}>
            {scanning ? <Spinner /> : "📷 Escanear QR"}
          </Button>
        </div>
      </div>

      {error && <Toast type="error" message={error} onDismiss={() => setError("")} />}

      {scanning &&
        createPortal(
          <div className="fixed inset-0 z-50" id="scan-frame">
            <button
              onClick={() => void stopAndClose()}
              className="absolute top-8 right-5 w-11 h-11 rounded-full bg-white/90 text-neutral-dark text-xl font-bold flex items-center justify-center shadow-lg active:scale-95"
              aria-label="Cancelar escaneo"
            >
              ✕
            </button>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative w-[19rem] h-[19rem] rounded-2xl"
                style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
              >
                <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-2xl" />
                <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-2xl" />
                <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-2xl" />
                <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-2xl" />
                <span className="absolute left-4 right-4 top-1/2 h-0.5 bg-green-400 opacity-80 animate-scan-line" />
              </div>
            </div>
            <p className="absolute left-0 right-0 bottom-16 text-center text-white font-semibold drop-shadow px-8">
              Apunta al QR en el computador (Configuración → Conectar dispositivo)
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}