"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@ai-trading/shared";
import { api } from "./api";

const STORAGE_KEY = "arena_user";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (handle: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setUser(null);
      return;
    }
    try {
      const u = await api.user(raw);
      setUser({ id: u.id, handle: u.handle, balance: u.balance });
      setError(null);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signup = useCallback(async (handle: string) => {
    setError(null);
    try {
      const u = await api.createUser(handle);
      localStorage.setItem(STORAGE_KEY, u.id);
      setUser(u);
    } catch (e) {
      // Surface "username already taken", validation errors, etc. to the UI.
      setError((e as Error).message);
      throw e;
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, signup, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
