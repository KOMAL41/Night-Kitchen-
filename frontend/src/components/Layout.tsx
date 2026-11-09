import { NavLink, Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_CONFIG, Role } from "../roleConfig";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = (user?.role || "hotel_manager") as Role;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.hotel_manager;

  // Route guard: this role may only load pages listed in its own config.
  // Anyone landing outside that set (e.g. kitchen staff hitting /app/employees
  // directly) is bounced back to their own dashboard.
  if (!config.allowedPaths.includes(location.pathname)) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex min-h-screen bg-brand-mist">
      <aside className="hidden w-64 flex-col border-r border-slate-100 bg-white p-5 md:flex">
        <div className="mb-1 flex items-center gap-2 px-1">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-bold text-white ${config.accent}`}>
            K
          </div>
          <span className="font-display text-base font-bold">{config.appName}</span>
        </div>
        <p className="mb-6 px-1 text-xs font-medium text-slate-400">{config.roleLabel}</p>
        <nav className="flex flex-1 flex-col gap-1">
          {config.nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive ? `${config.accent} text-white shadow-md` : "text-slate-500 hover:bg-slate-50"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          <LogOut size={18} /> Log out
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 md:px-6">
          <div>
            <p className="font-display text-lg font-bold">{config.appName}</p>
            <p className="text-xs text-slate-400">
              {role === "platform_admin" ? "Every kitchen on the platform" : "Cyber Hub Cloud Kitchen"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              aria-label="Log out"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-500 hover:bg-slate-50 md:hidden"
            >
              <LogOut size={18} />
              <span className="hidden xs:inline">Log out</span>
            </button>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${config.accent}`}>
              {(user?.name || "K")[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-semibold leading-tight">{user?.name || "Guest"}</p>
              <p className="text-xs text-slate-400">{config.roleLabel}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:p-6">
          <Outlet />
        </main>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-slate-100 bg-white px-2 py-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden"
      >
        {config.nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium ${
                isActive ? "text-brand-violet" : "text-slate-500"
              }`
            }
          >
            <Icon size={18} />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
