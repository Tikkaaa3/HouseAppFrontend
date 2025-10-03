import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../api/axios";

type House = { id: string; name: string };
type User = {
  id: string;
  email: string;
  displayName: string;
  houseId?: string | null;
};

type AuthCtx = {
  user: User | null;
  house: House | null; // ⬅️ add house to context
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [house, setHouse] = useState<House | null>(null); // ⬅️
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    if (!token) return;
    const { data } = await api.get("/auth/me");
    setUser(data.user ?? data); // supports old shape
    setHouse(data.house ?? null); // ⬅️ set house if present
  };

  useEffect(() => {
    setAuthToken(token);
    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user ?? data);
        setHouse(data.house ?? null); // ⬅️
      } catch {
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    hydrate();
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    const tk = data.token;
    localStorage.setItem("token", tk);
    setAuthToken(tk);
    setToken(tk);
    setUser(data.user);
    // pull fresh house from /auth/me (in case login response lacks house)
    try {
      const me = await api.get("/auth/me");
      setHouse(me.data.house ?? null);
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setHouse(null);
    location.href = "/login";
  };

  const value = useMemo(
    () => ({ user, house, token, login, logout, loading, refreshMe }),
    [user, house, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
