export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T | null;
}

export interface ConnectionInfo {
  version: number;
  host: string;
  hosts: string[];
  port: number;
  clientId: string | null;
  clientName: string | null;
  qr: string;
}

export interface QrPayload {
  v: number;
  host: string;
  port: number;
  clientId: string;
  clientName: string;
}

export interface ValidateClientData {
  idCliente: string;
  name: string;
  imagePath: string | null;
}

export interface SessionUser {
  userId: number;
  username: string;
  role: number;
  name?: string;
  changePin: boolean;
  token: string;
}

export interface LoginPayload {
  idClient: string;
  userClient: string;
  passClient: string;
  pin?: string;
  mode?: "pin" | "password";
}

export interface JwtPayload {
  id: string;
  username: string;
  role: number;
}

export interface ProductCategoryDTO {
  id: number;
  name: string;
  urlImage: string | null;
  imagePath: string | null;
}

export interface ProductDTO {
  id: number;
  name: string;
  description: string | null;
  urlImage: string | null;
  imagePath: string | null;
  productCategory: ProductCategoryDTO;
}

export interface MenuItemDTO {
  id: number;
  menuId: number;
  product: ProductDTO;
  price: string;
}

export interface MenuDTO {
  id: number;
  name: string;
  menuItems: MenuItemDTO[];
}

export interface OrderTypeParamsDTO {
  id: number;
  value: string;
  valueType: string;
  definition: {
    id: number;
    code: string;
    name: string;
    description: string;
  } | null;
}

export interface OrderTypeDTO {
  id: number;
  description: string | null;
  name: string;
  colorLabel: string;
  paramType: string;
  parameters: OrderTypeParamsDTO[];
}

export interface TableDTO {
  id: number;
  name: string;
  seats: number;
  statusTab: "OCCUPIED" | "FREE" | string;
  locationId?: number | null;
  locationName?: string | null;
}

export interface ItemStatusDTO {
  id: number;
  name: string;
  description: string;
  sequence: number;
  paramStatus: string;
}

export interface OrderStatusDTO {
  id: number;
  name: string;
  description: string;
  sequence: number;
  paramPanel: boolean;
  paramStatus: string;
}

export interface OrderMetadataDTO {
  nameCustomer?: string;
  notesOrder?: string;
}

export interface OrderItemDTO {
  id: string;
  localId: number;
  quantity: number;
  notes: string;
  menuItem: MenuItemDTO;
  itemStatus: ItemStatusDTO;
}

export interface OrderDTO {
  id: string;
  localNumber: number;
  customerId: number;
  total: number;
  totalV: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  type: OrderTypeDTO;
  guestCustomer?: {
    id: number;
    name: string;
    address: string;
    phone: string;
    codCity: number;
  } | null;
  orderStatus: OrderStatusDTO | null;
  table: TableDTO | null;
  items: OrderItemDTO[];
  metadataOrder: OrderMetadataDTO[];
}

export interface CreateOrderItem {
  menuItemId: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderDTO {
  customerId: number;
  orderType: number;
  tableId?: number;
  name?: string;
  address?: string;
  codCity?: number;
  phone?: string;
  notes?: string;
  userId: number;
  clientRef?: string;
  items: CreateOrderItem[];
}

export const ORDER_CONST = {
  ONSITE: "ONSITE",
  DELIVERY: "DELIVERY",
  CARRY: "CARRY",
  PENDING: "PENDING",
  PREPARATION: "PREPARATION",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELED: "CANCELED",
  INVOICED: "INVOICED",
} as const;

export interface CartItem {
  menuItem: MenuItemDTO;
  quantity: number;
  notes: string;
}