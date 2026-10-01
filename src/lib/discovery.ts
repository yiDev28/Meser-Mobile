import { ApiError } from "./api";
import { getLocalNetworkInfo } from "../plugins/networkInfo";

const DISCOVERY_PORT = 3457;
const TIMEOUT_MS = 900;
const CONCURRENCY = 20;

export interface DiscoveredServer {
  host: string;
  port: number;
  clientId: string;
  clientName: string;
}

export interface DiscoverProgress {
  scanned: number;
  total: number;
}

function fetchWithTimeout(url: string, ms: number, ...signals: (AbortSignal | undefined)[]): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ctrl.abort();
      break;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return fetch(url, { signal: ctrl.signal }).finally(() => {
    clearTimeout(timer);
    for (const s of signals) s?.removeEventListener("abort", onAbort);
  });
}

function buildTargets(ip: string, prefixLength: number): string[] {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
    return [];
  }
  const prefix = Math.max(24, Math.min(prefixLength, 31));
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const base = ((((octets[0] << 8) | octets[1]) << 8 | octets[2]) << 8 | octets[3]) >>> 0;
  const network = (base & mask) >>> 0;
  const hostCount = (1 << (32 - prefix)) - 2;

  const targets: string[] = [];
  for (let i = 1; i <= hostCount; i++) {
    const addr = network + i;
    if (addr === base) continue;
    targets.push(`${(addr >>> 24) & 255}.${(addr >>> 16) & 255}.${(addr >>> 8) & 255}.${addr & 255}`);
  }
  return targets;
}

function isConnectionInfo(x: unknown): x is {
  host: string;
  clientId?: string | null;
  clientName?: string | null;
} {
  return !!x && typeof (x as { host?: unknown }).host === "string";
}

export async function discoverServer(
  onProgress?: (p: DiscoverProgress) => void,
  external?: AbortSignal
): Promise<DiscoveredServer | null> {
  const net = await getLocalNetworkInfo();
  if (!net.available || !net.ip || net.prefixLength == null) {
    throw new ApiError("No se pudo detectar la red de este dispositivo.");
  }

  const targets = buildTargets(net.ip, net.prefixLength);
  const total = targets.length;
  if (total === 0) {
    throw new ApiError("No se pudo calcular la red a escanear.");
  }

  let scanned = 0;
  let next = 0;
  let found: DiscoveredServer | null = null;
  const guard = new AbortController();

  function report(scannedCount: number): void {
    onProgress?.({ scanned: scannedCount, total });
  }

  async function worker(): Promise<void> {
    while (found === null && !guard.signal.aborted && !external?.aborted) {
      const index = next++;
      if (index >= targets.length) break;
      const target = targets[index];
      try {
        const res = await fetchWithTimeout(
          `http://${target}:${DISCOVERY_PORT}/api/info`,
          TIMEOUT_MS,
          external,
          guard.signal
        );
        if (res.ok && !guard.signal.aborted && found === null) {
          try {
            const body = (await res.json()) as { code?: number; data?: unknown };
            if (body.code === 0 && isConnectionInfo(body.data)) {
              found = {
                host: target,
                port: DISCOVERY_PORT,
                clientId: body.data.clientId ?? "",
                clientName: body.data.clientName ?? "",
              };
              guard.abort();
            }
          } catch {
            // invalid body: ignore
          }
        }
      } catch {
        // unreachable host / timeout: keep scanning
      }
      scanned++;
      report(scanned);
      if (external?.aborted) break;
    }
  }

  const workers: Promise<void>[] = [];
  const workerCount = Math.min(CONCURRENCY, total);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (external?.aborted) return null;
  return found;
}