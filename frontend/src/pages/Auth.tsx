import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("manager@darkkitchen.io");
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = mode === "login" ? await login(email, password) : await register(name, email, password);
      navigate(user.role === "customer" ? "/customer" : "/app");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-mist px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient font-display text-sm font-bold text-white">K</div>
          <span className="font-display text-sm font-bold">Dark Kitchen</span>
        </Link>
        <h1 className="font-display text-xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "login" ? "Log in to continue." : "Create a customer account to place an order."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-brand-violet"
        >
          {mode === "login" ? "New customer? Create an account" : "Already have an account? Log in"}
        </button>

        {mode === "login" && (
          <div className="mt-6 rounded-xl bg-brand-mist px-3 py-3 text-xs text-slate-500">
            <p className="mb-1.5 font-semibold text-slate-600">Demo logins (password: Demo@123)</p>
            <ul className="space-y-0.5">
              <li>Platform Admin — platformadmin@darkkitchen.io</li>
              <li>Hotel Manager — manager@darkkitchen.io</li>
              <li>Kitchen Staff — kitchenstaff@darkkitchen.io</li>
              <li>Delivery Partner — delivery@darkkitchen.io</li>
              <li>Customer — customer@darkkitchen.io</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
