import { imageUrl } from "./api";
import { getProductImage, saveProductImage } from "./cache";

export interface ProductImageRef {
  imagePath?: string | null;
  urlImage?: string | null;
}

const imageCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function candidates(baseUrl: string, ref: ProductImageRef): { local: string; cloud: string } {
  return {
    local: imageUrl(baseUrl, ref.imagePath),
    cloud: imageUrl(baseUrl, ref.urlImage),
  };
}

/**
 * Orden de resolución: caché local -> imagen del desktop (LAN) -> imagen en la nube.
 */
export function imageCandidates(baseUrl: string, ref: ProductImageRef): string[] {
  const { local, cloud } = candidates(baseUrl, ref);
  const list: string[] = [];
  if (local && imageCache.has(local)) list.push(imageCache.get(local) as string);
  if (cloud && imageCache.has(cloud)) list.push(imageCache.get(cloud) as string);
  if (local) list.push(local);
  if (cloud) list.push(cloud);
  return Array.from(new Set(list));
}

/**
 * Carga las imágenes desde IndexedDB al caché en memoria para poder usarlas sin conexión.
 */
export async function hydrateImageCache(baseUrl: string, refs: ProductImageRef[]): Promise<void> {
  for (const ref of refs) {
    const { local, cloud } = candidates(baseUrl, ref);
    for (const key of [local, cloud]) {
      if (!key || imageCache.has(key)) continue;
      const dataUrl = await getProductImage(key);
      if (dataUrl) imageCache.set(key, dataUrl);
    }
  }
}

/**
 * Descarga las imágenes y las guarda en IndexedDB + caché en memoria.
 * Se ejecuta en segundo plano: no debe bloquear la carga del catálogo.
 */
export async function cacheProductImages(baseUrl: string, refs: ProductImageRef[]): Promise<void> {
  for (const ref of refs) {
    const { local, cloud } = candidates(baseUrl, ref);
    if ((local && imageCache.has(local)) || (cloud && imageCache.has(cloud))) continue;
    for (const key of [local, cloud]) {
      if (!key) continue;
      try {
        const res = await fetch(key);
        if (!res.ok) continue;
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        imageCache.set(key, dataUrl);
        await saveProductImage(key, dataUrl);
        break;
      } catch {
        // intenta el siguiente candidato (nube)
      }
    }
  }
}
