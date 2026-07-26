import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient, TOKEN_STORAGE_KEY } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get("/auth/me");
        setUsername(res.data.username);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (usernameInput: string, password: string) => {
    const res = await apiClient.post("/auth/login", { username: usernameInput, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.access_token);
    setToken(res.data.access_token);
    setUsername(usernameInput);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUsername(null);
  };

  const value = useMemo(
    () => ({ isAuthenticated: !!token, isLoading, username, login, logout }),
    [token, isLoading, username],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
