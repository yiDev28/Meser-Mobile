import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App } from "@capacitor/app";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { ApiClient, ApiError } from "../lib/api";
import type { QrPayload } from "../lib/types";
import { discoverServer, type DiscoveredServer, type DiscoverProgress } from "../lib/discovery";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CloseIcon,
  LinkIcon,
  QrCodeScannerIcon,
  SearchIcon,
} from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Spinner, Toast } from "../components/ui";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function ConnectPage() {
  const { connect } = useAuth();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("3457");
  const [nit, setNit] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [progress, setProgress] = useState<DiscoverProgress | null>(null);
  const [found, setFound] = useState<DiscoveredServer | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const closeScanRef = useRef<() => Promise<void>>(async () => undefined);
  const discoverCtrlRef = useRef<AbortController | null>(null);
  async function stopAndClose(): Promise<void> {
    await closeScanRef.current();
  }
  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Light });
  }, []);

  useEffect(() => {
    return () => {
      document.body.classList.remove("barcode-scanner-active");
      void BarcodeScanner.stopScan().catch(() => undefined);
      discoverCtrlRef.current?.abort();
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
  async function handleValidateAndConnect(): Promise<void> {
    if (!nit.trim()) {
      setError("Ingresa el NIT del cliente.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const api = tryConnect(host, port);
      const info = await api.getInfo();
      if (!info.clientId) {
        throw new ApiError(
          `Conectado a ${info.hosts.join(", ")} pero el sistema aún no registra un cliente en esta PC.`
        );
      }
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
  async function handleDiscover(): Promise<void> {
    setError("");
    setFound(null);
    setDiscovering(true);
    setProgress({ scanned: 0, total: 0 });
    const ctrl = new AbortController();
    discoverCtrlRef.current = ctrl;
    try {
      const server = await discoverServer((p) => setProgress(p), ctrl.signal);
      if (server) {
        setFound(server);
        setHost(server.host);
        setPort(String(server.port));
      } else if (!ctrl.signal.aborted) {
        setError(
          "Ningún servidor Meser encontrado. Revisa que el desktop esté encendido, en la misma red y el puerto 3457 abierto."
        );
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setError(e instanceof ApiError ? e.message : "No se pudo buscar en la red.");
      }
    } finally {
      setDiscovering(false);
      setProgress(null);
      discoverCtrlRef.current = null;
    }
  }
  async function handleConnectFound(s: DiscoveredServer): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await connect({
        host: s.host,
        port: s.port,
        clientId: s.clientId,
        clientName: s.clientName,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar.");
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
      <div className="hero-gradient safe-top shrink-0 px-6 pb-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-3xl bg-white text-primary flex items-center justify-center text-2xl font-black shadow-elev2">
            M
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-3xl font-black leading-tight drop-shadow-sm">Conecta con Meser</h1>
            <p className="text-white/75 text-xs mt-0.5">Sistema Meser</p>
          </div>
        </div>
        <p className="text-white/90 text-sm mt-4">
          Elige una opción para conectar este dispositivo al sistema del restaurante.
        </p>
      </div>
      <div className="bg-surface rounded-t-[28px] -mt-6 flex-1 min-h-0 overflow-y-auto px-4 pt-6 pb-[min(max(var(--safe-bottom),32px),44px)] shadow-elev3">
        <div className="app-surface p-4 space-y-3 animate-slide-up shadow-elev1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-semibold text-neutral-dark">Buscar en la red</span>
          </div>
          <p className="text-xs text-neutral-gray">
            Detecta automáticamente el sistema en esta red sin escribir nada (búsqueda en el puerto 3457).
          </p>
          {!found && (
            <Button full variant="outline" onClick={() => void handleDiscover()} disabled={busy || scanning || discovering}>
              {discovering ? <Spinner /> : <SearchIcon className="w-5 h-5" />}
              Buscar servidor en la red
            </Button>
          )}
          {discovering && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-neutral-gray">
                <span>Buscando…</span>
                <span>{progress ? `${progress.scanned}/${progress.total} revisados` : ""}</span>
              </div>
              <button
                type="button"
                onClick={() => discoverCtrlRef.current?.abort()}
                className="text-xs text-primary underline self-start"
              >
                Cancelar búsqueda
              </button>
            </div>
          )}
          {found && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-semibold text-neutral-dark">
                  {found.clientName || "Servidor Meser"}
                </span>
              </div>
              <p className="text-xs text-neutral-gray">
                {found.host}:{found.port}
              </p>
              <Button full variant="secondary" onClick={() => void handleConnectFound(found)} disabled={busy}>
                {busy ? <Spinner /> : <LinkIcon className="w-5 h-5" />}
                Conectar
              </Button>
            </div>
          )}
        </div>
        <div className="app-surface p-4 mt-3 space-y-3 animate-slide-up shadow-elev1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center">2</span>
            <span className="text-sm font-semibold text-neutral-dark">Escanea el QR</span>
          </div>
          <p className="text-xs text-neutral-gray">
            En el computador abre Configuración → "Conectar dispositivo" y escanea el código QR.
          </p>
          <Button full variant="outline" onClick={handleScan} disabled={busy || scanning}>
            {scanning ? <Spinner /> : <QrCodeScannerIcon className="w-5 h-5" />}
            Escanear QR
          </Button>
        </div>
        <div className="app-surface p-4 mt-3 space-y-3 animate-slide-up shadow-elev1">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-neutral-300 text-neutral-dark text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-sm font-semibold text-neutral-dark">Ingreso manual</span>
            </div>
            <span className={`text-xs text-neutral-gray transition-transform ${manualOpen ? "rotate-180" : ""}`}>
              <ChevronDownIcon className="w-5 h-5" />
            </span>
          </button>
          {manualOpen && (
            <div className="space-y-4">
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
              <Input
                label="NIT del restaurante"
                placeholder="900123456"
                value={nit}
                onChange={(e) => setNit(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
              />
              <Button full variant="secondary" onClick={handleValidateAndConnect} disabled={busy || scanning}>
                {busy ? <Spinner /> : <CheckCircleIcon className="w-5 h-5" />}
                Validar y conectar
              </Button>
            </div>
          )}
        </div>
      </div>
      {error && <Toast type="error" message={error} onDismiss={() => setError("")} />}
      {scanning &&
        createPortal(
          <div className="fixed inset-0 z-50" id="scan-frame">
            <button
              onClick={() => void stopAndClose()}
              style={{ top: "calc(var(--safe-top) + 2rem)" }}
              className="absolute right-5 z-20 w-11 h-11 rounded-full bg-white/90 text-neutral-dark flex items-center justify-center shadow-lg active:scale-95"
              aria-label="Cancelar escaneo"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
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