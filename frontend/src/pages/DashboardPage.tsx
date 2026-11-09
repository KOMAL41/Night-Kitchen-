import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  IndianRupee, ClipboardList, TrendingUp, AlertTriangle, Building2, Users,
  Bike, ChefHat, Timer, Wallet, Power,
} from "lucide-react";
import { api, DashboardData, Order, Employee } from "../lib/api";
import { Card, Spinner, Badge, Button, ErrorState } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function errorMessage(err: any): string {
  if (err?.status === 403) return "Your session doesn't match this login anymore — try logging out and back in.";
  if (err?.status === 401) return "Your session expired — please log in again.";
  return err?.message || "Couldn't load dashboard data.";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "platform_admin") return <OwnerDashboard />;
  if (role === "kitchen_staff") return <KitchenStaffDashboard />;
  if (role === "delivery_partner") return <DeliveryDashboard />;
  return <ManagerDashboard />;
}

// ============================== HOTEL MANAGER ==============================
function ManagerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<DashboardData>("/api/dashboard").then(setData).catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const stats = [
    { label: "Revenue today", value: `₹${data.revenue_today.toLocaleString("en-IN")}`, icon: IndianRupee },
    { label: "Orders today", value: data.orders_today, icon: ClipboardList },
    { label: "Active orders", value: data.active_orders, icon: TrendingUp },
    { label: "Low stock items", value: data.low_stock_count, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-400">A live snapshot of Cyber Hub Cloud Kitchen.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <Icon size={16} className="text-brand-violet" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Revenue, last 7 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.revenue_trend}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [`₹${v}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Top selling items</p>
        <div className="space-y-3">
          {data.top_products.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-violet">{i + 1}</span>
                {p.name}
              </span>
              <span className="text-slate-400">{p.orders.toLocaleString("en-IN")} orders</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================== PLATFORM OWNER ==============================
function OwnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<DashboardData>("/api/dashboard").then(setData).catch((e) => setError(errorMessage(e)));
    api.get<Employee[]>("/api/employees").then((e) => setEmployeeCount(e.length)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Platform Console</h1>
        <p className="text-sm text-slate-400">Every kitchen running on Dark Kitchen.</p>
      </div>

      <Card className="flex items-center gap-4 border-amber-100 bg-amber-50/50 p-5">
        <Building2 size={22} className="text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">1 kitchen live on the platform</p>
          <p className="text-xs text-amber-700/80">
            The schema is multi-kitchen-ready — every table already carries a kitchen_id — so onboarding
            kitchen #2 needs no database changes, just a "Create kitchen" flow.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Platform revenue (today)</p>
          <p className="mt-2 font-display text-2xl font-bold">₹{data.revenue_today.toLocaleString("en-IN")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Orders across platform</p>
          <p className="mt-2 font-display text-2xl font-bold">{data.orders_today}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Active kitchens</p>
          <p className="mt-2 font-display text-2xl font-bold">1 <span className="text-sm font-normal text-slate-400">/ 1</span></p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Staff across platform</p>
          <p className="mt-2 font-display text-2xl font-bold">{employeeCount ?? "—"}</p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Revenue trend, last 7 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.revenue_trend}>
            <defs>
              <linearGradient id="rev-owner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [`₹${v}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} fill="url(#rev-owner)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ============================== KITCHEN STAFF ==============================
function KitchenStaffDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<Order[]>("/api/orders").then(setOrders).catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Spinner />;

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Kitchen Display</h1>
        <p className="text-sm text-slate-400">What needs cooking, right now.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-100 bg-red-50/50 p-5 text-center">
          <p className="font-display text-3xl font-bold text-red-600">{pending.length}</p>
          <p className="mt-1 text-xs font-semibold text-red-700">Waiting to start</p>
        </Card>
        <Card className="border-amber-100 bg-amber-50/50 p-5 text-center">
          <p className="font-display text-3xl font-bold text-amber-600">{preparing.length}</p>
          <p className="mt-1 text-xs font-semibold text-amber-700">Cooking now</p>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/50 p-5 text-center">
          <p className="font-display text-3xl font-bold text-emerald-600">{ready.length}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">Ready to hand off</p>
        </Card>
      </div>

      <Link to="/app/orders">
        <Button className="w-full !bg-gradient-to-br !from-sky-500 !to-cyan-600 justify-center py-3">
          <ChefHat size={18} /> Open the order queue
        </Button>
      </Link>
    </div>
  );
}

// ============================== DELIVERY PARTNER ==============================
function DeliveryDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<Order[]>("/api/orders").then(setOrders).catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Spinner />;

  const readyForPickup = orders.filter((o) => o.status === "ready").length;
  const outForDelivery = orders.filter((o) => o.status === "out_for_delivery").length;
  const completedToday = orders.filter((o) => o.status === "completed").length;
  const estimatedEarnings = completedToday * 35; // flat estimate — no per-partner assignment tracking yet

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Delivery Dashboard</h1>
          <p className="text-sm text-slate-400">Your shift, at a glance.</p>
        </div>
        <button
          onClick={() => setOnline(!online)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${
            online ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-slate-400"
          }`}
        >
          <Power size={15} /> {online ? "Online" : "Offline"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Ready for pickup</p>
            <Timer size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{readyForPickup}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Out for delivery</p>
            <Bike size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{outForDelivery}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Completed today</p>
            <ClipboardList size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{completedToday}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Est. earnings today</p>
            <Wallet size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">₹{estimatedEarnings}</p>
        </Card>
      </div>
      <p className="text-xs text-slate-400">
        Earnings are estimated at ₹35/delivery — per-partner order assignment isn't wired up yet, so this
        counts all completed kitchen orders rather than just yours.
      </p>

      <Link to="/app/orders">
        <Button className="w-full !bg-gradient-to-br !from-emerald-500 !to-teal-600 justify-center py-3">
          <Bike size={18} /> View my deliveries
        </Button>
      </Link>
    </div>
  );
}
