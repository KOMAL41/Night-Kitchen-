import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { api, Order } from "../lib/api";
import { Card, Button, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "platform_admin";
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api.get<Order[]>("/api/orders").then(setOrders);
  }, []);

  if (!orders) return <Spinner />;

  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;

  function exportOrdersCsv() {
    const rows = [
      ["Order ID", "Status", "Total (₹)", "Payment", "Delivery Address", "Placed At"],
      ...orders!.map((o) => [
        String(o.id), o.status, String(o.total_amount), o.payment_method, o.delivery_address,
        new Date(o.created_at).toLocaleString(),
      ]),
    ];
    downloadCsv(`orders-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportDailyClosingCsv() {
    const rows = [
      ["Metric", "Value"],
      ["Total orders", String(orders!.length)],
      ["Completed", String(completed)],
      ["Cancelled", String(cancelled)],
      ["Total revenue (₹)", String(totalRevenue)],
      ["Net (all cash on delivery)", String(totalRevenue)],
    ];
    downloadCsv(`daily-closing-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-slate-400">
          {isOwner ? "Platform-wide order and revenue exports." : "Download order history and daily closing reports."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Total orders</p>
          <p className="mt-2 font-display text-2xl font-bold">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Total revenue</p>
          <p className="mt-2 font-display text-2xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Cancelled</p>
          <p className="mt-2 font-display text-2xl font-bold">{cancelled}</p>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold">Downloads</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={exportOrdersCsv}>
            <FileDown size={15} /> Full order history (CSV)
          </Button>
          <Button variant="ghost" onClick={exportDailyClosingCsv}>
            <FileDown size={15} /> Daily closing report (CSV)
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          CSV exports open directly in Excel or Google Sheets. PDF export isn't wired up yet — CSV covers the
          same data and is the quicker win to ship first.
        </p>
      </Card>
    </div>
  );
}
