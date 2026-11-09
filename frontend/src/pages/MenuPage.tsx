import { useEffect, useRef, useState } from "react";
import { Star, Pencil, Trash2, Plus, Search, Tag, X } from "lucide-react";
import { api, Product, Offer } from "../lib/api";
import { Card, Badge, Toggle, Button, Input, Modal, Spinner, EmptyState } from "../components/ui";

const EMPTY_FORM = {
  name: "", description: "", image_url: "", price: 0, cost: 0,
  is_veg: true, is_bestseller: false, is_chef_special: false, is_trending: false, is_todays_special: false,
};
const EMPTY_OFFER = { product_id: 0, name: "", percent_off: 10, ends_at: "" };

export default function MenuPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({});
  const togglingIdsRef = useRef(new Set<number>());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);

  function load() {
    api.get<Product[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(setProducts);
  }
  function loadOffers() {
    api.get<Offer[]>("/api/offers").then(setOffers);
  }

  useEffect(() => { load(); }, [search]);
  useEffect(() => { loadOffers(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, image_url: p.image_url, price: p.price, cost: p.cost,
      is_veg: p.is_veg, is_bestseller: p.is_bestseller, is_chef_special: p.is_chef_special,
      is_trending: p.is_trending, is_todays_special: p.is_todays_special,
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) await api.put(`/api/products/${editing.id}`, { ...form, is_available: editing.is_available });
    else await api.post("/api/products", { ...form, is_available: true });
    setModalOpen(false);
    load();
  }

  async function toggle(p: Product) {
    if (togglingIdsRef.current.has(p.id)) return;
    togglingIdsRef.current.add(p.id);
    setTogglingIds(new Set(togglingIdsRef.current));
    setToggleErrors((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    setProducts((prev) => prev?.map((x) => (x.id === p.id ? { ...x, is_available: !p.is_available } : x)) ?? prev);
    try {
      const updated = await api.patch<Product>(`/api/products/${p.id}/toggle`);
      setProducts((prev) => prev?.map((x) => (x.id === p.id ? { ...x, is_available: updated.is_available } : x)) ?? prev);
    } catch (error) {
      setProducts((prev) => prev?.map((x) => (x.id === p.id ? { ...x, is_available: p.is_available } : x)) ?? prev);
      setToggleErrors((prev) => ({
        ...prev,
        [p.id]: error instanceof Error ? error.message : "Could not update availability.",
      }));
    } finally {
      togglingIdsRef.current.delete(p.id);
      setTogglingIds(new Set(togglingIdsRef.current));
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this menu item?")) return;
    await api.delete(`/api/products/${id}`);
    load();
  }

  function openCreateOffer() {
    setOfferForm({ ...EMPTY_OFFER, product_id: products?.[0]?.id || 0 });
    setOfferModalOpen(true);
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/offers", {
      ...offerForm,
      ends_at: new Date(offerForm.ends_at).toISOString(),
    });
    setOfferModalOpen(false);
    loadOffers();
  }

  async function removeOffer(id: number) {
    await api.delete(`/api/offers/${id}`);
    loadOffers();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu & Offers</h1>
          <p className="text-sm text-slate-400">Manage dishes, pricing, availability, and live customer offers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <Input placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56" />
          </div>
          <Button onClick={openCreate} className="whitespace-nowrap"><Plus size={16} /> Add item</Button>
        </div>
      </div>

      {/* ---------------- Offers ---------------- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Tag size={18} className="text-brand-violet" /> Active offers</h2>
          <Button variant="ghost" onClick={openCreateOffer}><Plus size={15} /> Create offer</Button>
        </div>
        {!offers ? (
          <Spinner />
        ) : offers.length === 0 ? (
          <p className="text-sm text-slate-400">No live offers. Create one and it shows up in the customer app instantly.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <Card key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{o.name}</p>
                  <p className="text-xs text-slate-400">{o.product_name} · {o.percent_off}% off · ends {new Date(o.ends_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => removeOffer(o.id)} className="text-red-500"><X size={15} /></button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Menu grid ---------------- */}
      {!products ? (
        <Spinner />
      ) : products.length === 0 ? (
        <EmptyState label="No menu items yet. Add your first dish." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative h-36 w-full bg-slate-100">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                <span className={`absolute left-3 top-3 h-3 w-3 rounded-full border-2 border-white ${p.is_available ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="absolute right-3 top-3">
                  <Badge tone={p.is_available ? "mint" : "slate"}>{p.is_available ? "Available" : "Paused"}</Badge>
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold leading-tight">{p.name}</p>
                    <p className="text-xs font-medium text-brand-violet">Menu item</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star size={12} fill="currentColor" /> {p.review_count > 0 ? p.avg_rating.toFixed(1) : p.rating}
                    {p.review_count > 0 && <span className="text-slate-400">({p.review_count})</span>}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 line-clamp-2">{p.description}</p>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="font-display text-lg font-bold">₹{p.price}</p>
                    <p className="text-[11px] text-slate-400">
                      Cost ₹{p.cost} · {p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0}% margin
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400">{p.orders_count.toLocaleString("en-IN")} orders</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Toggle checked={p.is_available} label={p.name} disabled={togglingIds.has(p.id)} onChange={() => toggle(p)} />
                    <span className="text-xs text-slate-400">{p.is_available ? "On" : "Off"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(p)} className="text-brand-violet"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
                {toggleErrors[p.id] && <p className="mt-2 text-xs text-red-600" role="alert">{toggleErrors[p.id]}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit menu item" : "Add menu item"}>
        <form onSubmit={save} className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            <Input type="number" placeholder="Cost (₹)" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-brand-mist p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_veg} onChange={(e) => setForm({ ...form, is_veg: e.target.checked })} /> Vegetarian</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_bestseller} onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })} /> Bestseller</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_chef_special} onChange={(e) => setForm({ ...form, is_chef_special: e.target.checked })} /> Chef Special</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_trending} onChange={(e) => setForm({ ...form, is_trending: e.target.checked })} /> Trending</label>
            <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={form.is_todays_special} onChange={(e) => setForm({ ...form, is_todays_special: e.target.checked })} /> Today's Special</label>
          </div>
          <Button type="submit" className="w-full">{editing ? "Save changes" : "Add item"}</Button>
        </form>
      </Modal>

      <Modal open={offerModalOpen} onClose={() => setOfferModalOpen(false)} title="Create offer">
        <form onSubmit={saveOffer} className="space-y-3">
          <select
            value={offerForm.product_id}
            onChange={(e) => setOfferForm({ ...offerForm, product_id: Number(e.target.value) })}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
          >
            {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Input placeholder="Offer name (e.g. Weekend Special)" value={offerForm.name} onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })} required />
          <Input type="number" placeholder="Percent off" value={offerForm.percent_off} onChange={(e) => setOfferForm({ ...offerForm, percent_off: Number(e.target.value) })} required />
          <div>
            <label className="mb-1 block text-xs text-slate-400">Offer ends</label>
            <Input type="datetime-local" value={offerForm.ends_at} onChange={(e) => setOfferForm({ ...offerForm, ends_at: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full">Save offer</Button>
        </form>
      </Modal>
    </div>
  );
}
