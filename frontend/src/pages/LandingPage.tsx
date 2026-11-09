import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Star, ArrowRight, Check } from "lucide-react";

const CAPABILITIES = ["Orders", "Menu & Offers", "Inventory", "Employees", "Reviews", "Analytics"];

const HIGHLIGHTS = [
  { title: "Kitchen operations", description: "Manage orders, staff, inventory, and daily reports from role-specific dashboards." },
  { title: "Menu management", description: "Update product pricing, availability, and customer offers from one place." },
  { title: "Customer ordering", description: "Customers can browse the menu, check out with cash on delivery, and review completed orders." },
];

const MODULES = [
  { name: "Kitchen operations", tag: "For kitchen teams", features: ["Role-specific dashboards", "Order workflow and status updates", "Inventory, employees, and reports"], featured: false },
  { name: "Menu management", tag: "For managers", features: ["Products and availability controls", "Offers and discounted prices", "Stock levels and reorder points"], featured: true },
  { name: "Customer ordering", tag: "For customers", features: ["Menu browsing, search, and cart", "Cash-on-delivery checkout", "Order history and verified reviews"], featured: false },
];

const FAQ = [
  { q: "Can I manage more than one kitchen in this build?", a: "Not yet. The current app runs against one default kitchen; kitchen provisioning and switching are not implemented." },
  { q: "How are order updates delivered?", a: "Customer and staff screens refresh order data while open. This build does not use WebSockets." },
  { q: "Can I sign in with Google?", a: "No. The app currently supports email and password; Google OAuth is not connected." },
  { q: "Which features are available now?", a: "Kitchen dashboards, menu and offer management, orders, inventory, employees, analytics, customer COD checkout, and verified reviews." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-brand-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-brand-ink px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient font-display text-sm font-bold text-white">K</div>
          <span className="font-display text-sm font-bold text-white">Dark Kitchen</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/60 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#modules" className="hover:text-white">Modules</a>
          <a href="#faq" className="hover:text-white">FAQs</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white">Log in</Link>
          <Link to="/login" className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-md">
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero — dark, premium section (rest of the page stays on the light theme below) */}
      <section className="relative overflow-hidden bg-brand-ink px-6 pb-24 pt-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.25),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200">
              Built for cloud kitchens like yours
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Run your kitchen{" "}
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">like a modern SaaS platform</span>
            </h1>
            <p className="mt-5 max-w-lg text-white/70">
              Manage orders, inventory, menus, kitchen staff, delivery partners, offers, analytics, and
              customer reviews — all from one intelligent dashboard.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" className="flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-violet/30">
                Create an account <ArrowRight size={16} />
              </Link>
              <a href="#modules" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white">
                Explore modules
              </a>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-white/60 sm:grid-cols-3">
              {["Kitchen dashboards", "Menu availability", "Order status workflow", "Verified reviews", "Inventory tracking", "COD checkout"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> {t}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=900&q=80"
              alt="Signature biryani from a cloud kitchen"
              className="w-full rounded-3xl object-cover shadow-2xl"
            />
            <div className="absolute -left-4 top-6 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md sm:-left-8">
              <p className="text-[11px] text-white/60">Sample active orders</p>
              <p className="font-display text-lg font-bold">128 Active</p>
            </div>
            <div className="absolute -right-4 top-1/3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md sm:-right-8">
              <p className="flex items-center gap-1 text-[11px] text-white/60"><Star size={10} className="fill-amber-400 text-amber-400" /> Sample rating</p>
              <p className="font-display text-lg font-bold">4.9/5</p>
            </div>
            <div className="absolute -left-4 bottom-6 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md sm:-left-8">
              <p className="text-[11px] text-white/60">Sample revenue</p>
              <p className="font-display text-lg font-bold">₹1.8L</p>
            </div>
          </div>
        </div>
      </section>

      {/* Below the hero, the rest of the page stays on the original vibrant/light theme */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 text-center">
        <div id="features" className="flex flex-wrap items-center justify-center gap-2">
          {CAPABILITIES.map((i) => (
            <span key={i} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-500">
              {i}
            </span>
          ))}
        </div>
      </section>

      {/* Current modules */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-16 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="font-display text-base font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </div>
        ))}
      </section>

      {/* Available modules */}
      <section id="modules" className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold">Explore the available modules</h2>
        <p className="mt-2 text-center text-sm text-slate-500">This build includes the following kitchen and customer workflows.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {MODULES.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 ${p.featured ? "bg-brand-gradient text-white shadow-xl" : "border border-slate-100 bg-white shadow-sm"}`}
            >
              <p className={`text-lg font-semibold ${p.featured ? "text-white" : "text-brand-ink"}`}>{p.name}</p>
              <p className={`mt-1 text-xs ${p.featured ? "text-white/70" : "text-slate-400"}`}>{p.tag}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.featured ? "bg-white" : "bg-brand-violet"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold ${
                  p.featured ? "bg-white text-brand-violet" : "bg-brand-ink text-white"
                }`}
              >
                Open sign in
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((item, idx) => (
            <div key={item.q} className="rounded-xl border border-slate-100">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
              >
                {item.q}
                <ChevronDown size={16} className={`transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
              </button>
              {openFaq === idx && <p className="px-5 pb-4 text-sm text-slate-500">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-brand-gradient px-8 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to explore the kitchen workflow?</h2>
          <p className="mt-2 text-white/80">Sign in with a demo role or create a customer account to place an order.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-violet">
            Continue to sign in <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © 2026 Dark Kitchen. Built for cloud kitchens across India.
      </footer>
    </div>
  );
}
