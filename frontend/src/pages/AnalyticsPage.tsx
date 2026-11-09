import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Sparkles } from "lucide-react";
import { api, DashboardData, Product } from "../lib/api";
import { Card, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "platform_admin";
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/api/dashboard").then(setDashboard);
    api.get<Product[]>("/api/products").then(setProducts);
  }, []);

  if (!dashboard || !products) return <Spinner />;

  const margins = products.map((p) => ({
    name: p.name.split(" ").slice(0, 2).join(" "),
    margin: p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0,
  }));

  const bestMargin = [...margins].sort((a, b) => b.margin - a.margin)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{isOwner ? "Platform Analytics" : "Analytics"}</h1>
        <p className="text-sm text-slate-400">
          {isOwner ? "Aggregated across every kitchen on the platform." : "Margins, demand, and AI-flagged insights."}
        </p>
      </div>

      <Card className="flex items-start gap-3 p-5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${isOwner ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-brand-gradient"}`}>
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold">AI insight</p>
          <p className="text-sm text-slate-500">
            {bestMargin
              ? `${bestMargin.name} carries your best margin at ${bestMargin.margin}%. Highlighting it on the menu could lift overall profitability.`
              : "Add products to unlock margin insights."}{" "}
            {dashboard.low_stock_count > 0 &&
              `${dashboard.low_stock_count} ingredient${dashboard.low_stock_count > 1 ? "s are" : " is"} running low — restock soon to avoid order cancellations.`}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Margin by menu item</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={margins} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#334155" }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Margin"]} />
            <Bar dataKey="margin" fill="#7C3AED" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Avg order value</p>
          <p className="mt-2 font-display text-2xl font-bold">₹{dashboard.avg_order_value}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Active orders</p>
          <p className="mt-2 font-display text-2xl font-bold">{dashboard.active_orders}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Menu items</p>
          <p className="mt-2 font-display text-2xl font-bold">{products.length}</p>
        </Card>
      </div>
    </div>
  );
}
