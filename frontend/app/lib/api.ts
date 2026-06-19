// In production: frontend is served by Express on port 3000, so API is same origin
// In dev: Vite runs on 5173/5174, backend on 3000 — need explicit port
const isDev = window.location.port !== "3000" && window.location.port !== "";
const API_BASE = isDev
  ? `http://${window.location.hostname}:3000/api`
  : `/api`;

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Types
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  orderId: number;
  menuItemId: number;
  menuItem: MenuItem;
}

export interface TableOrder {
  id: number;
  tableNumber: number;
  status: "PENDING" | "DONE";
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Ingredient {
  id: number;
  name: string;
  stockQuantity: number;
  unit: string;
}

export interface TodaySummary {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  orders: TableOrder[];
}

export interface Recipe {
  id: number;
  menuItemId: number;
  ingredientId: number;
  quantityRequired: number;
  menuItem: MenuItem;
  ingredient: Ingredient;
}

export interface MenuItemWithRecipes extends MenuItem {
  recipes: Recipe[];
}

// Menu
export const getMenu = () => fetchJSON<MenuItemWithRecipes[]>("/menu");
export const createMenuItem = (name: string, price: number) =>
  fetchJSON<MenuItemWithRecipes>("/menu", {
    method: "POST",
    body: JSON.stringify({ name, price }),
  });
export const updateMenuItem = (id: number, data: { name?: string; price?: number }) =>
  fetchJSON<MenuItemWithRecipes>(`/menu/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteMenuItem = (id: number) =>
  fetchJSON<{ success: boolean }>(`/menu/${id}`, { method: "DELETE" });

// Orders
export const getActiveOrders = () => fetchJSON<TableOrder[]>("/orders/active");
export const getOrder = (id: number) => fetchJSON<TableOrder>(`/orders/${id}`);
export const createOrder = (tableNumber: number) =>
  fetchJSON<TableOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ tableNumber }),
  });
export const addItemsToOrder = (orderId: number, items: { menuItemId: number; quantity: number }[]) =>
  fetchJSON<{ order: TableOrder }>(`/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
export const removeOrderItem = (orderId: number, itemId: number) =>
  fetchJSON<{ order: TableOrder }>(`/orders/${orderId}/items/${itemId}`, {
    method: "DELETE",
  });
export const updateOrderStatus = (id: number, status: "PENDING" | "DONE") =>
  fetchJSON<TableOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const getTodaySummary = () => fetchJSON<TodaySummary>("/orders/summary/today");
export const getDetailedSummary = () => fetchJSON<TodaySummary>("/orders/summary/detailed");

// Inventory
export const getInventory = () => fetchJSON<Ingredient[]>("/inventory");
export const createIngredient = (name: string, stockQuantity: number, unit: string) =>
  fetchJSON<Ingredient>("/inventory", {
    method: "POST",
    body: JSON.stringify({ name, stockQuantity, unit }),
  });
export const updateIngredient = (id: number, data: { name?: string; stockQuantity?: number; unit?: string }) =>
  fetchJSON<Ingredient>(`/inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const restockIngredient = (id: number, quantity: number) =>
  fetchJSON<Ingredient>(`/inventory/${id}/restock`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
export const deleteIngredient = (id: number) =>
  fetchJSON<{ success: boolean }>(`/inventory/${id}`, { method: "DELETE" });

// Recipes
export const getRecipes = () => fetchJSON<Recipe[]>("/recipes");
export const getRecipesForMenuItem = (menuItemId: number) =>
  fetchJSON<Recipe[]>(`/recipes/menu-item/${menuItemId}`);
export const createRecipe = (menuItemId: number, ingredientId: number, quantityRequired: number) =>
  fetchJSON<Recipe>("/recipes", {
    method: "POST",
    body: JSON.stringify({ menuItemId, ingredientId, quantityRequired }),
  });
export const updateRecipe = (id: number, quantityRequired: number) =>
  fetchJSON<Recipe>(`/recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ quantityRequired }),
  });
export const deleteRecipe = (id: number) =>
  fetchJSON<{ success: boolean }>(`/recipes/${id}`, { method: "DELETE" });
