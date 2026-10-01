import { Capacitor, registerPlugin } from "@capacitor/core";

export interface LocalNetworkInfo {
  available: boolean;
  ip?: string;
  prefixLength?: number;
}

export interface NetworkInfoPlugin {
  getLocalIp(): Promise<LocalNetworkInfo>;
}

const plugin = registerPlugin<NetworkInfoPlugin>("NetworkInfo", {
  web: () => ({
    getLocalIp: async () => ({ available: false }),
  }),
});

export function getLocalNetworkInfo(): Promise<LocalNetworkInfo> {
  if (Capacitor.getPlatform() !== "android") {
    return Promise.resolve({ available: false });
  }
  return plugin.getLocalIp();
}