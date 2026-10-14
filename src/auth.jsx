import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const isStaff = (user) => user?.role === "admin" || user?.role === "developer";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // token hết hạn -> về trang đăng nhập
    if (!getToken()) return;
    api
      .get("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [logout]);

  const authenticate = async (path, body) => {
    const res = await api.post(path, body);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const value = {
    user,
    loading,
    logout,
    login: (username, password) => authenticate("/auth/login", { username, password }),
    register: (data) => authenticate("/auth/register", data),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
