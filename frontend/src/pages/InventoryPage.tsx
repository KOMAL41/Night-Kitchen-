import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, Send } from "lucide-react";
import { api, InventoryItem } from "../lib/api";
import { Card, Badge, Button, Input, Modal, Spinner, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function InventoryPage() {
  const { user } = useAuth();
  if (user?.role === "kitchen_staff") return <KitchenIngredientsView />;
  return <ManagerInventory />;
}

const EMPTY = { name: "", unit: "kg", quantity: 0, reorder_level: 0, supplier: "" };

// ============================== HOTEL MANAGER: full CRUD ==============================
function ManagerInventory() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function load() { api.get<InventoryItem[]>("/api/inventory").then(setItems); }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/inventory", form);
    setForm(EMPTY);
    setModalOpen(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Remove this inventory item?")) return;
    await api.delete(`/api/inventory/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-slate-400">Track stock levels and reorder points.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add stock item</Button>
      </div>

      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState label="No inventory items yet." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-mist text-left text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Reorder level</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const low = it.quantity <= it.reorder_level;
                return (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{it.name}</td>
                    <td className="px-5 py-3">{it.quantity} {it.unit}</td>
                    <td className="px-5 py-3">{it.reorder_level} {it.unit}</td>
                    <td className="px-5 py-3 text-slate-400">{it.supplier || "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={low ? "amber" : "mint"}>{low ? "Low stock" : "In stock"}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => remove(it.id)} className="text-red-500"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add stock item">
        <form onSubmit={save} className="space-y-3">
          <Input placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Unit (kg, l, pcs)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>
          <Input type="number" placeholder="Reorder level" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} />
          <Input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <Button type="submit" className="w-full">Add item</Button>
        </form>
      </Modal>
    </div>
  );
}

// ============================== KITCHEN STAFF: read-only + request refill ==============================
function KitchenIngredientsView() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [requested, setRequested] = useState<Set<number>>(new Set());

  useEffect(() => { api.get<InventoryItem[]>("/api/inventory").then(setItems); }, []);

  if (!items) return <Spinner />;

  const low = items.filter((it) => it.quantity <= it.reorder_level);
  const ok = items.filter((it) => it.quantity > it.reorder_level);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Ingredients</h1>
        <p className="text-sm text-slate-400">What's in stock right now — flag anything running low.</p>
      </div>

      {low.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle size={16} /> {low.length} ingredient{low.length > 1 ? "s" : ""} running low
          </p>
          <div className="space-y-2">
            {low.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span>{it.name} — {it.quantity} {it.unit} left</span>
                {requested.has(it.id) ? (
                  <Badge tone="mint">Requested</Badge>
                ) : (
                  <button
                    onClick={() => setRequested((s) => new Set(s).add(it.id))}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700"
                  >
                    <Send size={12} /> Request refill
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold">Available ingredients</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ok.map((it) => (
            <div key={it.id} className="rounded-xl bg-brand-mist px-3 py-2.5 text-sm">
              <p className="font-medium">{it.name}</p>
              <p className="text-xs text-slate-400">{it.quantity} {it.unit}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
