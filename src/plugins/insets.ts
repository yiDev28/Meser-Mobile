import { registerPlugin } from "@capacitor/core";

export interface SafeAreaInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface InsetsPlugin {
  getInsets(): Promise<SafeAreaInsets>;
}

export const Insets = registerPlugin<InsetsPlugin>("Insets");