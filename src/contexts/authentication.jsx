import React, { useEffect, useState } from "react";
import supabase from "@/lib/db";              // ✅ ใช้ default import
import { useNavigate } from "react-router-dom";

const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: false,          // สำหรับปุ่ม login/register
    getUserLoading: true,    // โหลดสถานะครั้งแรก
    error: null,
    user: null,
  });

  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[auth] getUser error:", error.message);
        setState((s) => ({ ...s, user: null, getUserLoading: false, error: error.message }));
        return;
      }
      setState((s) => ({
        ...s,
        user: data?.user ?? null,
        getUserLoading: false,
        error: null,
      }));
    } catch (e) {
      console.error("[auth] getUser exception:", e);
      setState((s) => ({ ...s, user: null, getUserLoading: false, error: e.message }));
    }
  };

  useEffect(() => {
    let mounted = true;

    fetchUser(); // โหลดตอน mount

    // subscribe เปลี่ยนแปลง session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (!mounted) return;
      fetchUser();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setState((s) => ({ ...s, loading: false }));
      if (error) return { error: error.message };
      navigate("/");
      return {};
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return { error: e.message };
    }
  };

  const register = async ({ name, username, email, password }) => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, username, role: "user" } },
      });
      setState((s) => ({ ...s, loading: false }));
      if (error) return { error: error.message };

      if (!data?.user) return { error: "Please confirm your email." };
      return {};
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return { error: e.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState((s) => ({ ...s, user: null }));
    navigate("/");
  };

  const isAuthenticated = Boolean(state.user);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, fetchUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => React.useContext(AuthContext);
