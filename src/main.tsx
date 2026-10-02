import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { Insets } from "./plugins/insets.ts";

async function readInsets(): Promise<{ top: number; bottom: number } | null> {
  try {
    const ins = await Insets.getInsets();
    if (ins.left > 0 || ins.top > 0 || ins.right > 0 || ins.bottom > 0) {
      return { top: Math.max(0, ins.top), bottom: Math.max(0, ins.bottom) };
    }
  } catch {
    // ignorar y reintentar
  }
  return null;
}

async function applySafeArea(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  let insets = await readInsets();
  if (!insets) {
    await new Promise((r) => setTimeout(r, 400));
    insets = await readInsets();
  }
  if (!insets) {
    try {
      const info = await StatusBar.getInfo();
      insets = { top: Math.max(0, info.height), bottom: 0 };
    } catch {
      // fallback: env(safe-area-inset-*) como respaldo en CSS
    }
  }
  if (insets) {
    const root = document.documentElement;
    root.style.setProperty("--safe-top", `${insets.top}px`);
    root.style.setProperty("--safe-bottom", `${insets.bottom}px`);
  }
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // sin estilos en web
  }
}

const KB_EXTRA_GAP = 24;

let kbHeight = 0;

function scrollParents(el: HTMLElement): HTMLElement[] {
  const list: HTMLElement[] = [];
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") list.push(node);
    node = node.parentElement;
  }
  return list;
}

function keepInputVisible(): void {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return;
  const tag = el.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA") return;

  const limitFor = (bottom: number) => bottom - kbHeight - KB_EXTRA_GAP;
  const parents = scrollParents(el);

  if (parents.length === 0) {
    const rect = el.getBoundingClientRect();
    const limit = limitFor(window.innerHeight);
    if (rect.bottom > limit) window.scrollBy(0, rect.bottom - limit);
    return;
  }

  for (const sc of parents) {
    const rect = el.getBoundingClientRect();
    const limit = limitFor(sc.getBoundingClientRect().bottom);
    if (rect.bottom > limit) sc.scrollTop += rect.bottom - limit;
  }
}

function syncKeyboard(height: number): void {
  const root = document.documentElement;
  kbHeight = height;
  root.style.setProperty("--keyboard-height", `${height}px`);
  root.style.setProperty("--kb-height", `${height}px`);
  root.classList.toggle("kb-open", height > 0);
  requestAnimationFrame(() => {
    keepInputVisible();
    requestAnimationFrame(keepInputVisible);
    if (height > 0) window.setTimeout(keepInputVisible, 250);
  });
}

if (Capacitor.isNativePlatform()) {
  Keyboard.addListener("keyboardWillShow", (info) => syncKeyboard(info.keyboardHeight));
  Keyboard.addListener("keyboardDidShow", (info) => syncKeyboard(info.keyboardHeight));
  Keyboard.addListener("keyboardWillHide", () => syncKeyboard(0));
  Keyboard.addListener("keyboardDidHide", () => syncKeyboard(0));

  document.addEventListener("focusin", () => {
    if (kbHeight > 0) requestAnimationFrame(keepInputVisible);
  });
}

// Forzar alto del root al viewport visual real (se actualiza al abrir/cerrar teclado)
if (typeof window !== "undefined" && window.visualViewport) {
  const vv = window.visualViewport;
  const setVh = () => {
    document.documentElement.style.setProperty("--vvh", `${vv.height * 0.01}px`);
  };
  vv.addEventListener("resize", setVh);
  vv.addEventListener("scroll", setVh);
  setVh();
}

void applySafeArea();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);