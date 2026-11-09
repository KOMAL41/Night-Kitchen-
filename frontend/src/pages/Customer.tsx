import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Plus, Minus, ShoppingBag, X, LogOut, Tag, Clock, Search, SlidersHorizontal,
  Heart, Flame, ChefHat, TrendingUp, Leaf, Instagram, Facebook, Twitter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { api, Product, Offer, Order, Category, Review } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Badge, EmptyState, Skeleton } from "../components/ui";

const STEPS = ["pending", "preparing", "ready", "out_for_delivery", "completed"];
const STEP_LABELS: Record<string, string> = {
  pending: "Order placed", preparing: "Preparing", ready: "Ready",
  out_for_delivery: "Out for delivery", completed: "Delivered",
};
const FAVORITES_KEY = "dk_favorites";

// ---------- Placeholder helper ----------
// Prep time isn't a real backend field yet (unlike veg/bestseller/chef-special/
// trending/today's-special, which are now genuine manager-controlled columns).
// This stays a stable per-product estimate until a real field is added.
function prepTimeFor(p: Product) {
  return 15 + ((p.id * 7) % 20); // stable per product, 15–34 min
}

function effectivePrice(product: Product) {
  return product.discounted_price && product.discounted_price < product.price
    ? product.discounted_price
    : product.price;
}

function lineTotal(product: Product, quantity: number) {
  return effectivePrice(product) * quantity;
}

type SortMode = "default" | "price_low" | "price_high" | "rating" | "discount" | "fast_delivery";

export default function Customer() {
  const [tab, setTab] = useState<"menu" | "favourites" | "orders">("menu");
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-brand-mist pb-20 md:pb-0">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient font-display text-sm font-bold text-white">K</div>
          <div>
            <p className="font-display text-sm font-bold leading-tight">Cyber Hub Cloud Kitchen</p>
            <p className="text-[11px] text-slate-400">Delivering to your saved address</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-1 md:flex">
            <button onClick={() => setTab("menu")} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "menu" ? "bg-brand-mist text-brand-violet" : "text-slate-500"}`}>Menu</button>
            <button onClick={() => setTab("favourites")} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "favourites" ? "bg-brand-mist text-brand-violet" : "text-slate-500"}`}>Favourites</button>
            <button onClick={() => setTab("orders")} className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "orders" ? "bg-brand-mist text-brand-violet" : "text-slate-500"}`}>
              My Orders {itemCount > 0 && tab !== "orders" ? "" : ""}
            </button>
          </nav>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {(user?.name || "C")[0].toUpperCase()}
          </div>
          <button onClick={logout} className="hidden text-slate-400 hover:text-brand-ink md:block" title="Log out"><LogOut size={18} /></button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mx-auto max-w-6xl px-5 py-6"
        >
          {tab === "menu" && <MenuTab onOrderPlaced={() => setTab("orders")} />}
          {tab === "favourites" && <FavouritesTab />}
          {tab === "orders" && <OrdersTab />}
        </motion.main>
      </AnimatePresence>

      {(tab === "menu" || tab === "favourites") && <SiteFooter />}

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-100 bg-white py-2 md:hidden">
        <button onClick={() => setTab("menu")} className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${tab === "menu" ? "text-brand-violet" : "text-slate-400"}`}>
          <ShoppingBag size={20} /> Menu
        </button>
        <button onClick={() => setTab("favourites")} className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${tab === "favourites" ? "text-brand-violet" : "text-slate-400"}`}>
          <Heart size={20} /> Favourites
        </button>
        <button onClick={() => setTab("orders")} className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${tab === "orders" ? "text-brand-violet" : "text-slate-400"}`}>
          <Clock size={20} /> Orders
        </button>
        <button onClick={logout} className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-slate-400"><LogOut size={20} /> Log out</button>
      </nav>
    </div>
  );
}

// ============================== HERO CAROUSEL ==============================
function HeroCarousel({ offers }: { offers: Offer[] | null }) {
  const [index, setIndex] = useState(0);
  const slides = offers && offers.length > 0 ? offers : null;

  useEffect(() => {
    if (!slides || slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides]);

  if (!slides) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-8 py-10 text-white sm:py-14">
        <p className="font-display text-2xl font-extrabold sm:text-3xl">Hungry? We've got you.</p>
        <p className="mt-2 max-w-md text-sm text-white/85">
          Fresh from Cyber Hub Cloud Kitchen, delivered to your door. Cash on delivery, every order.
        </p>
      </div>
    );
  }

  const offer = slides[index];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 px-8 py-10 text-white sm:py-14">
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35 }}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            <Tag size={12} /> {offer.percent_off}% OFF
          </span>
          <p className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{offer.name}</p>
          <p className="mt-2 max-w-md text-sm text-white/85">
            On {offer.product_name} — now ₹{offer.discounted_price} instead of ₹{offer.original_price}.
            Ends {new Date(offer.ends_at).toLocaleDateString()}.
          </p>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================== FOOD CARD ==============================
function FoodCard({
  product, offer, isFavorite, onToggleFavorite,
}: {
  product: Product; offer?: Offer;
  isFavorite: boolean; onToggleFavorite: () => void;
}) {
  const { lines, addItem, setQuantity } = useCart();
  const qty = lines.find((l) => l.product.id === product.id)?.quantity || 0;
  const veg = product.is_veg;
  const badge = product.is_bestseller ? "bestseller" : product.is_chef_special ? "special" : product.is_trending ? "trending" : product.is_todays_special ? "todays" : undefined;
  const hasReviews = product.review_count > 0;
  const displayRating = hasReviews ? product.avg_rating : product.rating;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
    >
      <div className="group relative h-40 w-full overflow-hidden bg-slate-100">
        {product.image_url && (
          <motion.img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.35 }}
            className="h-full w-full object-cover"
          />
        )}
        <span className={`absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded border-2 ${veg ? "border-emerald-600 bg-white" : "border-red-600 bg-white"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
        </span>
        <button
          onClick={onToggleFavorite}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"} />
        </button>
        {offer && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1 text-[10px] font-bold text-white">
            {offer.percent_off}% OFF
          </span>
        )}
        {badge === "bestseller" && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-1 text-[10px] font-bold text-white">
            <Star size={10} fill="currentColor" /> Bestseller
          </span>
        )}
        {badge === "trending" && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
            <TrendingUp size={10} /> Trending
          </span>
        )}
        {badge === "special" && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-sky-600 px-2 py-1 text-[10px] font-bold text-white">
            <ChefHat size={10} /> Chef Special
          </span>
        )}
        {badge === "todays" && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-[10px] font-bold text-white">
            <Tag size={10} /> Today's Special
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{product.name}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
            <Star size={12} fill="currentColor" /> {displayRating.toFixed(1)}
            <span className="font-normal text-slate-400">{hasReviews ? `(${product.review_count})` : "(New)"}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{product.description}</p>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={11} /> {prepTimeFor(product)} min
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div>
            {offer ? (
              <div className="flex items-baseline gap-1.5">
                <p className="font-display text-lg font-bold text-orange-600">₹{offer.discounted_price}</p>
                <p className="text-xs line-through text-slate-400">₹{product.price}</p>
              </div>
            ) : (
              <p className="font-display text-lg font-bold">₹{product.price}</p>
            )}
          </div>
          {qty === 0 ? (
            <Button onClick={() => addItem(product)} className="!px-3 !py-1.5 text-xs">
              <Plus size={14} /> Add
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-brand-mist px-2 py-1">
              <button onClick={() => setQuantity(product.id, qty - 1)} className="text-brand-violet"><Minus size={14} /></button>
              <span className="w-4 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => addItem(product)} className="text-brand-violet"><Plus size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================== MENU + CART + CHECKOUT ==============================
function MenuTab({ onOrderPlaced }: { onOrderPlaced: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("default");
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); } catch { return new Set(); }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<number | null>(null);
  const { lines, setQuantity, itemCount, total, clear } = useCart();

  useEffect(() => {
    api.get<Product[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(setProducts);
  }, [search]);
  useEffect(() => {
    api.get<Offer[]>("/api/offers").then(setOffers);
    api.get<Category[]>("/api/categories").then(setCategories);
  }, []);

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function offerFor(productId: number) {
    return offers?.find((o) => o.product_id === productId);
  }

  const availableProducts = useMemo(() => (products || []).filter((p) => p.is_available), [products]);
  const categoriesInUse = useMemo(
    () => (categories || []).filter((c) => availableProducts.some((p) => p.category_id === c.id)),
    [categories, availableProducts]
  );

  const bestsellers = useMemo(() => availableProducts.filter((p) => p.is_bestseller), [availableProducts]);
  const chefSpecials = useMemo(() => availableProducts.filter((p) => p.is_chef_special), [availableProducts]);
  const todaysSpecials = useMemo(() => availableProducts.filter((p) => p.is_todays_special), [availableProducts]);
  // "Recommended" is intentionally computed (popularity + rating), not a manager flag — matches the brief.
  const recommended = useMemo(
    () => [...availableProducts].sort((a, b) => (b.orders_count * b.rating) - (a.orders_count * a.rating)).slice(0, 3),
    [availableProducts]
  );

  const isBrowsing = search.trim() === "" && activeCategory === "all" && !vegOnly && !nonVegOnly && sort === "default";

  const filteredSorted = useMemo(() => {
    let list = availableProducts.filter((p) => activeCategory === "all" || p.category_id === activeCategory);
    if (vegOnly) list = list.filter((p) => p.is_veg);
    if (nonVegOnly) list = list.filter((p) => !p.is_veg);
    if (sort === "discount") list = list.filter((p) => !!offerFor(p.id));

    const sorted = [...list];
    if (sort === "price_low") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price_high") sorted.sort((a, b) => b.price - a.price);
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    if (sort === "fast_delivery") sorted.sort((a, b) => prepTimeFor(a) - prepTimeFor(b));
    if (sort === "discount") sorted.sort((a, b) => (offerFor(b.id)?.percent_off || 0) - (offerFor(a.id)?.percent_off || 0));
    return sorted;
  }, [availableProducts, activeCategory, vegOnly, nonVegOnly, sort, offers]);

  async function placeOrder() {
    if (!address.trim()) return;
    setPlacing(true);
    try {
      const order = await api.post<{ id: number }>("/api/orders", {
        delivery_address: address,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      clear();
      setPlaced(order.id);
      setCartOpen(false);
    } catch (e: any) {
      alert(e.message || "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-2xl text-white">✓</div>
        <h2 className="font-display text-xl font-bold">Order placed!</h2>
        <p className="text-sm text-slate-500">Order #{placed} · Pay cash on delivery.</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setPlaced(null)}>Order more</Button>
          <Button onClick={onOrderPlaced}>Track my order</Button>
        </div>
      </div>
    );
  }

  const activeFilterCount = [vegOnly, nonVegOnly, sort !== "default"].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <HeroCarousel offers={offers} />

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input
            placeholder="Search dishes, categories, ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          <SlidersHorizontal size={15} /> Filters
          {activeFilterCount > 0 && <Badge tone="mint">{activeFilterCount}</Badge>}
        </button>
      </div>

      {/* Category chips */}
      {categoriesInUse.length > 0 && (
        <div className="sticky top-[57px] z-30 -mx-5 border-b border-slate-100 bg-brand-mist/95 px-5 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCategory === "all" ? "bg-brand-gradient text-white" : "bg-white text-slate-500 border border-slate-200"}`}
            >
              All
            </button>
            {categoriesInUse.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCategory === c.id ? "bg-brand-gradient text-white" : "bg-white text-slate-500 border border-slate-200"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!products ? (
        <CardGridSkeleton />
      ) : availableProducts.length === 0 ? (
        <EmptyState label="No dishes on the menu right now — check back soon." />
      ) : isBrowsing ? (
        <>
          {offers && offers.length > 0 && (
            <Section title="Current Offers" icon={<Tag size={16} className="text-orange-600" />}>
              {availableProducts.filter((p) => offerFor(p.id)).map((p) => (
                <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </Section>
          )}
          {bestsellers.length > 0 && (
            <Section title="Best Sellers" icon={<Star size={16} className="text-amber-500" fill="currentColor" />}>
              {bestsellers.map((p) => (
                <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </Section>
          )}
          {chefSpecials.length > 0 && (
            <Section title="Chef's Specials" icon={<ChefHat size={16} className="text-sky-600" />}>
              {chefSpecials.map((p) => (
                <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </Section>
          )}
          {todaysSpecials.length > 0 && (
            <Section title="Today's Special" icon={<Tag size={16} className="text-purple-600" />}>
              {todaysSpecials.map((p) => (
                <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </Section>
          )}
          {recommended.length > 0 && (
            <Section title="Recommended" icon={<Flame size={16} className="text-rose-500" />}>
              {recommended.map((p) => (
                <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
              ))}
            </Section>
          )}
          <Section title="All Menu Items" icon={<ShoppingBag size={16} className="text-brand-violet" />}>
            {availableProducts.map((p) => (
              <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
            ))}
          </Section>
        </>
      ) : filteredSorted.length === 0 ? (
        <EmptyState label="No dishes match your search or filters — try clearing a few." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSorted.map((p) => (
            <FoodCard key={p.id} product={p} offer={offerFor(p.id)} isFavorite={favorites.has(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
          ))}
        </div>
      )}

      {/* Floating cart */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-xl md:bottom-8"
          >
            <ShoppingBag size={16} /> View cart · {itemCount} item{itemCount > 1 ? "s" : ""} · ₹{total}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Filters drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => setFiltersOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Filters</h3>
                <button onClick={() => setFiltersOpen(false)}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Diet</p>
                  <div className="flex gap-2">
                    <FilterChip active={vegOnly} onClick={() => { setVegOnly(!vegOnly); setNonVegOnly(false); }} icon={<Leaf size={13} />}>Veg Only</FilterChip>
                    <FilterChip active={nonVegOnly} onClick={() => { setNonVegOnly(!nonVegOnly); setVegOnly(false); }}>Non-Veg</FilterChip>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Sort by</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["default", "Featured"], ["price_low", "Price: Low to High"], ["price_high", "Price: High to Low"],
                      ["rating", "Rating"], ["discount", "Discount"], ["fast_delivery", "Fast Delivery"],
                    ] as [SortMode, string][]).map(([key, label]) => (
                      <FilterChip key={key} active={sort === key} onClick={() => setSort(key)}>{label}</FilterChip>
                    ))}
                  </div>
                </div>
              </div>
              <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>Apply</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setCartOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Your cart</h3>
              <button onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {lines.map((l) => {
                const unitPrice = effectivePrice(l.product);
                return (
                  <div key={l.product.id} className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{l.product.name}</p>
                      <p className="font-semibold">₹{lineTotal(l.product, l.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>₹{unitPrice} each</span>
                      <div className="flex items-center gap-2 rounded-lg bg-brand-mist px-2 py-1">
                        <button onClick={() => setQuantity(l.product.id, l.quantity - 1)} className="text-brand-violet"><Minus size={14} /></button>
                        <span className="w-4 text-center font-semibold">{l.quantity}</span>
                        <button onClick={() => setQuantity(l.product.id, l.quantity + 1)} className="text-brand-violet"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
              <span>Total</span><span>₹{total}</span>
            </div>
            <div className="mt-4 space-y-3">
              <Input placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <div className="rounded-xl bg-brand-mist px-3 py-2.5 text-xs text-slate-500">
                Payment: <span className="font-semibold text-slate-700">Cash on Delivery</span> — online payment isn't set up yet.
              </div>
              <Button className="w-full" disabled={!address.trim() || placing} onClick={placeOrder}>
                {placing ? "Placing order…" : "Confirm order · COD"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4 }}>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">{icon} {title}</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </motion.section>
  );
}

function FilterChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-brand-violet bg-brand-mist text-brand-violet" : "border-slate-200 text-slate-500"
      }`}
    >
      {icon} {children}
    </button>
  );
}

// ============================== FAVOURITES ==============================
function FavouritesTab() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    api.get<Product[]>("/api/products").then(setProducts);
    api.get<Offer[]>("/api/offers").then(setOffers);
  }, []);

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  if (!products) return <CardGridSkeleton />;
  const favProducts = products.filter((p) => favorites.has(p.id));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Your Favourites</h1>
      {favProducts.length === 0 ? (
        <EmptyState label="Nothing saved yet — tap the heart on any dish to add it here." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favProducts.map((p) => (
            <FoodCard
              key={p.id} product={p} offer={offers?.find((o) => o.product_id === p.id)}
              isFavorite onToggleFavorite={() => toggleFavorite(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================== ORDER HISTORY + TRACKING + REVIEWS ==============================
function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ orderId: number; productId: number; productName: string } | null>(null);

  function load() { api.get<Order[]>("/api/orders/mine").then(setOrders); }
  function loadReviews() { api.get<Review[]>("/api/reviews/mine").then(setMyReviews); }
  useEffect(() => {
    load();
    loadReviews();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  function reviewFor(productId: number) {
    return myReviews.find((r) => r.product_id === productId);
  }

  if (!orders) return <CardGridSkeleton />;
  if (orders.length === 0) return <EmptyState label="No orders yet — your first order will show up here." />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">My Orders</h1>
      <div className="space-y-4">
        {orders.map((o) => {
          const stepIndex = o.status === "cancelled" ? -1 : STEPS.indexOf(o.status);
          return (
            <div key={o.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <Badge tone={o.status === "completed" ? "mint" : o.status === "cancelled" ? "slate" : "amber"}>
                  {STEP_LABELS[o.status] || o.status}
                </Badge>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                {o.items.map((it) => {
                  const existing = reviewFor(it.product_id);
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-2">
                      <span>{it.quantity}× {it.product_name}</span>
                      {o.status === "completed" && (
                        existing ? (
                          <button
                            onClick={() => setReviewTarget({ orderId: o.id, productId: it.product_id, productName: it.product_name })}
                            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-violet"
                          >
                            <Star size={12} fill="currentColor" /> Your rating: {existing.rating}★ · Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => setReviewTarget({ orderId: o.id, productId: it.product_id, productName: it.product_name })}
                            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600"
                          >
                            <Star size={12} /> Rate & Review
                          </button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
              {o.status !== "cancelled" && (
                <div className="mt-4 flex items-center gap-1">
                  {STEPS.map((s, i) => (<div key={s} className={`h-2 flex-1 rounded-full ${i <= stepIndex ? "bg-brand-gradient" : "bg-slate-100"}`} />))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-400">{o.delivery_address || "—"} · Cash on delivery</span>
                <span className="font-display font-bold">₹{o.total_amount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {reviewTarget && (
        <ReviewDialog
          target={reviewTarget}
          existing={reviewFor(reviewTarget.productId)}
          onClose={() => setReviewTarget(null)}
          onSaved={() => { setReviewTarget(null); loadReviews(); }}
        />
      )}
    </div>
  );
}

function ReviewDialog({
  target, existing, onClose, onSaved,
}: {
  target: { orderId: number; productId: number; productName: string };
  existing?: Review;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating || 5);
  const [title, setTitle] = useState(existing?.title || "");
  const [review, setReview] = useState(existing?.review || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (existing) {
        await api.put(`/api/reviews/${existing.id}`, { rating, title, review });
      } else {
        await api.post("/api/reviews", { order_id: target.orderId, product_id: target.productId, rating, title, review });
      }
      onSaved();
    } catch (e: any) {
      alert(e.message || "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing || !confirm("Delete your review?")) return;
    await api.delete(`/api/reviews/${existing.id}`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{target.productName}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star size={28} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Input placeholder="Review title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Tell others what you thought…"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          />
        </div>
        <div className="mt-5 flex gap-2">
          {existing && (
            <Button variant="danger" onClick={remove}>Delete</Button>
          )}
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? "Saving…" : existing ? "Update review" : "Submit review"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================== FOOTER ==============================
function SiteFooter() {
  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-100 px-5 py-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">K</div>
          <span className="font-display text-sm font-bold">Dark Kitchen</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
          <a href="#" className="hover:text-brand-ink">About</a>
          <a href="#" className="hover:text-brand-ink">Contact</a>
          <a href="#" className="hover:text-brand-ink">Privacy Policy</a>
          <a href="#" className="hover:text-brand-ink">Terms & Conditions</a>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <a href="#" aria-label="Instagram" className="hover:text-brand-violet"><Instagram size={16} /></a>
          <a href="#" aria-label="Facebook" className="hover:text-brand-violet"><Facebook size={16} /></a>
          <a href="#" aria-label="Twitter" className="hover:text-brand-violet"><Twitter size={16} /></a>
        </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-300">© 2026 Dark Kitchen. Built for cloud kitchens across India.</p>
    </footer>
  );
}
