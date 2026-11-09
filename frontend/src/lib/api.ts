const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// sessionStorage (not localStorage) is deliberate: it's scoped to a single
// tab, so logging in as a different role in one tab can never bleed into
// another tab's session. Each tab keeps its own independent login.
function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem("refresh_token");
  if (!refreshToken) return Promise.resolve(false);
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(async (res) => {
      if (res.status === 401) return false;
      if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
      const tokens = await res.json() as { access_token: string; refresh_token: string };
      sessionStorage.setItem("access_token", tokens.access_token);
      sessionStorage.setItem("refresh_token", tokens.refresh_token);
      return true;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = () => fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  let res = await send();
  if (
    res.status === 401 &&
    path !== "/api/auth/login" &&
    path !== "/api/auth/refresh" &&
    sessionStorage.getItem("access_token")
  ) {
    if (await refreshSession()) {
      res = await send();
    } else {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      window.dispatchEvent(new Event("auth:expired"));
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ---------- Types shared with the backend ----------
export type Category = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  price: number;
  cost: number;
  rating: number;
  orders_count: number;
  is_available: boolean;
  category_id: number | null;
  is_veg: boolean;
  is_bestseller: boolean;
  is_chef_special: boolean;
  is_trending: boolean;
  is_todays_special: boolean;
  avg_rating: number;
  review_count: number;
  discounted_price?: number | null;
};

export type Review = {
  id: number;
  customer_id: number;
  customer_name: string;
  product_id: number;
  product_name: string;
  order_id: number;
  rating: number;
  title: string;
  review: string;
  manager_reply: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  supplier: string;
};

export type Employee = {
  id: number;
  name: string;
  role_title: string;
  phone: string;
  shift: string;
  is_active: boolean;
};

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: number;
  status: string;
  total_amount: number;
  delivery_address: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
};

export type CartLine = { product: Product; quantity: number };

export type Offer = {
  id: number;
  product_id: number;
  product_name: string;
  name: string;
  percent_off: number;
  starts_at: string;
  ends_at: string;
  original_price: number;
  discounted_price: number;
};

export type DashboardData = {
  revenue_today: number;
  orders_today: number;
  active_orders: number;
  avg_order_value: number;
  low_stock_count: number;
  top_products: { name: string; orders: number }[];
  revenue_trend: { date: string; revenue: number }[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  kitchen_id: number;
};
