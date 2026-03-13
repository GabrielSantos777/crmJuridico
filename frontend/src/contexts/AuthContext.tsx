import { createContext, useState, useContext, useEffect } from "react";
import {
  getProfile,
  login as loginRequest,
  adminLogin as adminLoginRequest,
  register as registerRequest,
  selectOffice as selectOfficeRequest,
  forceChangePassword as forceChangePasswordRequest,
} from "../services/api";
import { toast } from "sonner";

type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  officeId?: string | null;
};

type LoginResult = { requiresOfficeSelection: boolean; requiresPasswordChange: boolean };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string, remember: boolean) => Promise<LoginResult>;
  selectOffice: (officeId: string) => Promise<AuthUser | null>;
  forceChangePassword: (newPassword: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<AuthUser | null>;
  register: (name: string, email: string, password: string, cpf: string) => Promise<AuthUser | null>;
  logout: () => void;
};

const TOKEN_KEY = "token";
const SELECTION_TOKEN_KEY = "selection_token";
const OFFICE_OPTIONS_KEY = "office_options";
const CHANGE_TOKEN_KEY = "change_token";
const REMEMBER_KEY = "remember_login";

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(identifier: string, password: string, remember: boolean): Promise<LoginResult> {
    const data = await loginRequest(identifier, password);
    sessionStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");

    if (data?.requiresPasswordChange) {
      sessionStorage.setItem(CHANGE_TOKEN_KEY, data.changeToken);
      return { requiresOfficeSelection: false, requiresPasswordChange: true };
    }

    if (data?.requiresOfficeSelection) {
      sessionStorage.setItem(SELECTION_TOKEN_KEY, data.selectionToken);
      sessionStorage.setItem(OFFICE_OPTIONS_KEY, JSON.stringify(data.offices ?? []));
      return { requiresOfficeSelection: true, requiresPasswordChange: false };
    }

    if (data?.access_token) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, data.access_token);
      const u = data.user ?? { email: identifier, id: data.user?.id ?? "unknown" };
      setUser(u);
      return { requiresOfficeSelection: false, requiresPasswordChange: false };
    }

    return { requiresOfficeSelection: false, requiresPasswordChange: false };
  }

  async function selectOffice(officeId: string) {
    const selectionToken = sessionStorage.getItem(SELECTION_TOKEN_KEY) || localStorage.getItem(SELECTION_TOKEN_KEY);
    if (!selectionToken) {
      return null;
    }
    const data = await selectOfficeRequest(selectionToken, officeId);
    if (data?.access_token) {
      const remember = sessionStorage.getItem(REMEMBER_KEY) === "1";
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.removeItem(SELECTION_TOKEN_KEY);
      sessionStorage.removeItem(OFFICE_OPTIONS_KEY);
      localStorage.removeItem(SELECTION_TOKEN_KEY);
      localStorage.removeItem(OFFICE_OPTIONS_KEY);
      sessionStorage.removeItem(REMEMBER_KEY);
      const u = data.user ?? { id: data.user?.id ?? "unknown", email: data.user?.email ?? "" };
      setUser(u);
      return u;
    }
    return null;
  }

  async function forceChangePassword(newPassword: string) {
    const changeToken = sessionStorage.getItem(CHANGE_TOKEN_KEY) || localStorage.getItem(CHANGE_TOKEN_KEY);
    if (!changeToken) return false;
    await forceChangePasswordRequest(changeToken, newPassword);
    sessionStorage.removeItem(CHANGE_TOKEN_KEY);
    localStorage.removeItem(CHANGE_TOKEN_KEY);
    return true;
  }

  async function register(name: string, email: string, password: string, cpf: string) {
    const data = await registerRequest(name, email, password, cpf);

    if (data?.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      const u = data.user ?? { email, name, id: data.user?.id ?? "unknown" };
      setUser(u);
      return u;
    }

    return null;
  }

  async function adminLogin(email: string, password: string) {
    const data = await adminLoginRequest(email, password);

    if (data?.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      const u = data.user ?? { email, id: data.user?.id ?? "unknown" };
      setUser(u);
      return u;
    }

    return null;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SELECTION_TOKEN_KEY);
    localStorage.removeItem(OFFICE_OPTIONS_KEY);
    localStorage.removeItem(CHANGE_TOKEN_KEY);
    sessionStorage.removeItem(SELECTION_TOKEN_KEY);
    sessionStorage.removeItem(OFFICE_OPTIONS_KEY);
    sessionStorage.removeItem(CHANGE_TOKEN_KEY);
    sessionStorage.removeItem(REMEMBER_KEY);
    setUser(null);
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    getProfile()
      .then((profile) => {
        const u = {
          id: profile.userId ?? profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          officeId: profile.officeId ?? null,
        };
        setUser(u);
        if (u.role === "UNASSIGNED") {
          toast.warning("Sua conta ainda nao foi vinculada a um grupo.");
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === "UNASSIGNED") {
      toast.warning("Sua conta ainda nao foi vinculada a um grupo.");
    }
  }, [user?.role]);

  return (
    <AuthContext.Provider value={{ user, loading, login, selectOffice, forceChangePassword, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
