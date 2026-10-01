import type {
  ApiResponse,
  ConnectionInfo,
  CreateOrderDTO,
  MenuDTO,
  OrderDTO,
  OrderTypeDTO,
  ProductCategoryDTO,
  SessionUser,
  TableDTO,
  ValidateClientData,
} from "./types";

const TIMEOUT_MS = 30000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function buildBaseUrl(host: string, port: number): string {
  const cleanHost = host.trim().replace(/\/+$/, "");
  return `http://${cleanHost}:${port}/api`;
}

export function imageUrl(baseUrl: string, path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      const apiIdx = u.pathname.indexOf("/api/");
      if (apiIdx === 0) {
        return `${baseUrl}${u.pathname.slice("/api".length)}${u.search}`;
      }
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return `${baseUrl}${u.pathname}${u.search}`;
      }
      return path;
    } catch {
      return path;
    }
  }
  return `${baseUrl}/${path.replace(/^\//, "")}`;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  get base(): string {
    return this.baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("Tiempo de espera agotado. Verifica que el desktop esté encendido.", 0);
      }
      throw new ApiError("No se pudo conectar al servidor. Verifica la IP y la red.", 0);
    }
    clearTimeout(timeout);

    if (res.status === 204) {
      return { code: 0, msg: "OK", data: null };
    }

    let payload: ApiResponse<T>;
    try {
      payload = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(`Respuesta no válida (${res.status})`, res.status);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ApiError(payload.msg || "No autorizado", res.status);
    }

    if (!res.ok) {
      throw new ApiError(payload.msg || `Error ${res.status}`, res.status);
    }

    return payload;
  }

  private guard<T>(payload: ApiResponse<T>): T {
    if (payload.code !== 0 || payload.data === null) {
      throw new ApiError(payload.msg || "Error del servidor");
    }
    return payload.data;
  }

  getInfo(): Promise<ConnectionInfo> {
    return this.request<ConnectionInfo>("GET", "/info").then((p) => this.guard(p));
  }

  validateNIT(idNumber: string): Promise<ValidateClientData> {
    return this.request<ValidateClientData>("POST", "/config/validate", { idNumber }).then((p) =>
      this.guard(p)
    );
  }

  login(payload: {
    idClient: string;
    userClient: string;
    passClient: string;
    pin?: string;
    mode: "pin" | "password";
  }): Promise<SessionUser> {
    return this.request<SessionUser>("POST", "/auth/login", payload).then((p) => this.guard(p));
  }

  changePin(userId: number, newPin: string): Promise<void> {
    return this.request<null>("POST", "/auth/change-pin", { userId, newPin }).then((p) => {
      if (p.code !== 0) throw new ApiError(p.msg);
    });
  }

  getMenu(): Promise<MenuDTO> {
    return this.request<MenuDTO>("GET", "/orders/menu").then((p) => this.guard(p));
  }

  getOrderTypes(): Promise<OrderTypeDTO[]> {
    return this.request<OrderTypeDTO[]>("GET", "/orders/type").then((p) => this.guard(p));
  }

  getTables(): Promise<TableDTO[]> {
    return this.request<TableDTO[]>("GET", "/orders/tables").then((p) => this.guard(p));
  }

  getCategories(): Promise<ProductCategoryDTO[]> {
    return this.request<ProductCategoryDTO[]>("GET", "/orders/categories").then((p) => this.guard(p));
  }

  getCurrentOrders(): Promise<OrderDTO[]> {
    return this.request<OrderDTO[]>("GET", "/orders/panel").then((p) => this.guard(p));
  }

  getOrder(id: string): Promise<OrderDTO> {
    return this.request<OrderDTO>(`GET`, `/orders/${id}`).then((p) => this.guard(p));
  }

  createOrder(order: CreateOrderDTO): Promise<OrderDTO> {
    return this.request<OrderDTO>("POST", "/orders", order).then((p) => this.guard(p));
  }
}