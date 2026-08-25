import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = {
  username: string | null;
  setUsername: (name: string | null) => void;
  logout: () => void;
};

const USER_KEY = "hal_username_v1";
const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(USER_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (username) localStorage.setItem(USER_KEY, username);
      else localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, [username]);

  const logout = () => {
    setName(null);
    try {
      localStorage.removeItem("hal_welcome_seen_v1");
    } catch {
      /* ignore */
    }
  };

  return (
    <UserContext.Provider value={{ username, setUsername: setName, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
