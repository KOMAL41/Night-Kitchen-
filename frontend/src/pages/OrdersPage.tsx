import { useEffect, useState } from "react";
import { Bike, MapPin, CheckCircle2 } from "lucide-react";
import { api, Order } from "../lib/api";
import { Card, Badge, Spinner, EmptyState, ErrorState, Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function OrdersPage() {
  const { user } = useAuth();
  if (user?.role === "kitchen_staff") return <KitchenQueue />;
  if (user?.role === "delivery_partner") return <DeliveryQueue />;
  return <ManagerOrderBoard />;
}

function errorMessage(err: any): string {
  if (err?.status === 403) return "Your session doesn't match this login anymore — try logging out and back in.";
  if (err?.status === 401) return "Your session expired — please log in again.";
  return err?.message || "Couldn't load orders.";
}

// ============================== HOTEL MANAGER: full 5-stage board ==============================
const COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "completed", label: "Completed" },
];
const NEXT_STATUS: Record<string, string> = {
  pending: "preparing", preparing: "ready", ready: "out_for_delivery", out_for_delivery: "completed",
};

function ManagerOrderBoard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<Order[]>("/api/orders").then(setOrders).catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setOrders((prev) => prev!.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    await api.patch(`/api/orders/${order.id}/status`, { status: next }).catch((e) => setError(errorMessage(e)));
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-slate-400">Full order board, refreshed automatically.</p>
      </div>
      {orders.length === 0 ? (
        <EmptyState label="No orders yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = orders.filter((o) => o.status === col.key);
            return (
              <div key={col.key}>
                <p className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {col.label} <Badge tone="slate">{items.length}</Badge>
                </p>
                <div className="space-y-3">
                  {items.map((o) => (
                    <Card key={o.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">#{o.id}</p>
                        <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleTimeString()}</p>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-slate-500">
                        {o.items.map((it) => (<li key={it.id}>{it.quantity}× {it.product_name}</li>))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="font-display text-sm font-bold">₹{o.total_amount}</p>
                        {NEXT_STATUS[o.status] && (
                          <button onClick={() => advance(o)} className="rounded-lg bg-brand-gradient px-2.5 py-1 text-[11px] font-semibold text-white">
                            Move to {NEXT_STATUS[o.status].replace(/_/g, " ")}
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================== KITCHEN STAFF: Kitchen Display System ==============================
function elapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function urgencyClasses(minutes: number) {
  if (minutes >= 15) return "border-red-300 bg-red-50";
  if (minutes >= 5) return "border-amber-300 bg-amber-50";
  return "border-emerald-300 bg-emerald-50";
}

function KitchenQueue() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<Order[]>("/api/orders")
      .then((all) => setOrders(all.filter((o) => ["pending", "preparing"].includes(o.status))))
      .catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 6000);
    return () => clearInterval(i);
  }, []);

  async function setStatus(order: Order, status: string) {
    setOrders((prev) => prev!.map((o) => (o.id === order.id ? { ...o, status } : o)).filter((o) => ["pending", "preparing"].includes(o.status)));
    await api.patch(`/api/orders/${order.id}/status`, { status }).catch((e) => setError(errorMessage(e)));
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Order Queue</h1>
        <p className="text-sm text-slate-400">Color-coded by wait time — red needs attention now.</p>
      </div>
      {orders.length === 0 ? (
        <EmptyState label="Queue is clear. Nice work." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => {
            const mins = elapsedMinutes(o.created_at);
            return (
              <div key={o.id} className={`rounded-2xl border-2 p-5 ${urgencyClasses(mins)}`}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold">Order #{o.id}</p>
                  <Badge tone={mins >= 15 ? "amber" : "slate"}>{mins}m</Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {o.items.map((it) => (<li key={it.id}>{it.quantity}× {it.product_name}</li>))}
                </ul>
                <div className="mt-4">
                  {o.status === "pending" ? (
                    <Button className="w-full !bg-gradient-to-br !from-sky-500 !to-cyan-600 justify-center" onClick={() => setStatus(o, "preparing")}>
                      Start Cooking
                    </Button>
                  ) : (
                    <Button className="w-full !bg-gradient-to-br !from-emerald-500 !to-teal-600 justify-center" onClick={() => setStatus(o, "ready")}>
                      Mark Ready
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================== DELIVERY PARTNER: pickup -> deliver ==============================
function DeliveryQueue() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    api.get<Order[]>("/api/orders")
      .then((all) => setOrders(all.filter((o) => ["ready", "out_for_delivery"].includes(o.status))))
      .catch((e) => setError(errorMessage(e)));
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  async function setStatus(order: Order, status: string) {
    setOrders((prev) => prev!.map((o) => (o.id === order.id ? { ...o, status } : o)).filter((o) => ["ready", "out_for_delivery"].includes(o.status)));
    await api.patch(`/api/orders/${order.id}/status`, { status }).catch((e) => setError(errorMessage(e)));
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Deliveries</h1>
        <p className="text-sm text-slate-400">Pick up ready orders, mark them delivered on drop-off.</p>
      </div>
      {orders.length === 0 ? (
        <EmptyState label="No deliveries waiting right now." />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold">Order #{o.id}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin size={14} /> {o.delivery_address || "No address given"}
                  </p>
                </div>
                <Badge tone={o.status === "ready" ? "amber" : "mint"}>
                  {o.status === "ready" ? "Ready for pickup" : "Out for delivery"}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {o.items.map((it) => (<li key={it.id}>{it.quantity}× {it.product_name}</li>))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-display font-bold">₹{o.total_amount} · Cash on delivery</p>
                {o.status === "ready" ? (
                  <Button className="!bg-gradient-to-br !from-emerald-500 !to-teal-600" onClick={() => setStatus(o, "out_for_delivery")}>
                    <Bike size={15} /> Picked Up
                  </Button>
                ) : (
                  <Button className="!bg-gradient-to-br !from-emerald-500 !to-teal-600" onClick={() => setStatus(o, "completed")}>
                    <CheckCircle2 size={15} /> Delivered
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
