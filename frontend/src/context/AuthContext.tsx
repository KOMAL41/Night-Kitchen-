import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "../lib/api";

type TokenResponse = { access_token: string; refresh_token: string; user: User };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Sessions are deliberately per-tab: the token lives in sessionStorage, which
// (unlike localStorage) is isolated to the tab that created it. Logging in
// as a different role in one tab never touches any other tab's session —
// each tab keeps its own login until that tab is closed.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener("auth:expired", handleSessionExpired);

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
    } else {
      api
        .get<User>("/api/auth/me")
        .then(setUser)
        .catch(() => {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    }

    return () => window.removeEventListener("auth:expired", handleSessionExpired);
  }, []);

  function persist(res: TokenResponse): User {
    sessionStorage.setItem("access_token", res.access_token);
    sessionStorage.setItem("refresh_token", res.refresh_token);
    setUser(res.user);
    return res.user;
  }

  async function login(email: string, password: string) {
    const res = await api.post<TokenResponse>("/api/auth/login", { email, password });
    return persist(res);
  }

  async function register(name: string, email: string, password: string, role = "customer") {
    const res = await api.post<TokenResponse>("/api/auth/register", { name, email, password, role });
    return persist(res);
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
