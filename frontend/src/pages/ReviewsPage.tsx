import { useEffect, useState } from "react";
import { Star, MessageSquare, Filter } from "lucide-react";
import { api, Review, Product } from "../lib/api";
import { Card, Badge, Spinner, EmptyState, Button, Input } from "../components/ui";

type Summary = { product_id: number; product_name: string; avg_rating: number; review_count: number };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [summary, setSummary] = useState<Summary[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productFilter, setProductFilter] = useState<number | "all">("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  function load() {
    const params = new URLSearchParams();
    if (productFilter !== "all") params.set("product_id", String(productFilter));
    if (ratingFilter !== "all") params.set("rating", String(ratingFilter));
    api.get<Review[]>(`/api/reviews?${params.toString()}`).then(setReviews);
  }

  useEffect(() => { load(); }, [productFilter, ratingFilter]);
  useEffect(() => {
    api.get<Summary[]>("/api/reviews/summary").then(setSummary);
    api.get<Product[]>("/api/products").then(setProducts);
  }, []);

  async function submitReply(reviewId: number) {
    const reply = replyDrafts[reviewId];
    if (!reply?.trim()) return;
    await api.patch(`/api/reviews/${reviewId}/reply`, { manager_reply: reply });
    load();
  }

  if (!reviews) return <Spinner />;

  const highest = summary ? [...summary].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 3) : [];
  const lowest = summary ? [...summary].sort((a, b) => a.avg_rating - b.avg_rating).slice(0, 3) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-slate-400">Real, verified-purchase customer feedback.</p>
      </div>

      {summary && summary.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-emerald-700">Highest rated</p>
            <div className="space-y-2">
              {highest.map((s) => (
                <div key={s.product_id} className="flex items-center justify-between text-sm">
                  <span>{s.product_name}</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Star size={12} fill="currentColor" /> {s.avg_rating} <span className="text-slate-400">({s.review_count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-red-700">Needs attention</p>
            <div className="space-y-2">
              {lowest.map((s) => (
                <div key={s.product_id} className="flex items-center justify-between text-sm">
                  <span>{s.product_name}</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Star size={12} fill="currentColor" /> {s.avg_rating} <span className="text-slate-400">({s.review_count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Filter size={13} /> Filter</span>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All dishes</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
        </select>
      </div>

      {reviews.length === 0 ? (
        <EmptyState label="No reviews match this filter yet." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{r.product_name}</p>
                  <p className="text-xs text-slate-400">{r.customer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="mint">Verified purchase</Badge>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                    ))}
                  </span>
                </div>
              </div>
              {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
              {r.review && <p className="mt-1 text-sm text-slate-600">{r.review}</p>}

              {r.manager_reply ? (
                <div className="mt-3 rounded-xl bg-brand-mist px-3 py-2.5 text-sm">
                  <p className="text-xs font-semibold text-brand-violet">Your reply</p>
                  <p className="text-slate-600">{r.manager_reply}</p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="Reply to this review…"
                    value={replyDrafts[r.id] || ""}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [r.id]: e.target.value })}
                  />
                  <Button variant="ghost" onClick={() => submitReply(r.id)}><MessageSquare size={14} /> Reply</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
