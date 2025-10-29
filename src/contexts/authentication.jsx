import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/db.js";

// สร้าง context เปล่า
const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: false,        // สำหรับปุ่ม login/register
    getUserLoading: true,  // โหลดสถานะครั้งแรกเพื่อเช็ค session
    error: null,
    user: null,
  });

  const navigate = useNavigate();

  // ดึง user ปัจจุบันจาก supabase
  async function fetchUser() {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("[auth] getUser error:", error.message);
        setState((s) => ({
          ...s,
          user: null,
          getUserLoading: false,
          error: error.message,
        }));
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
      setState((s) => ({
        ...s,
        user: null,
        getUserLoading: false,
        error: e.message,
      }));
    }
  }

  // รันครั้งแรก + subscribe การเปลี่ยนแปลง session
  useEffect(() => {
    let mounted = true;

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (!mounted) return;
      fetchUser();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // login
  async function login({ email, password }) {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setState((s) => ({ ...s, loading: false }));

      if (error) {
        return { error: error.message };
      }

      navigate("/");
      return {};
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return { error: e.message };
    }
  }

  // register
  async function register({ name, username, email, password }) {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, username, role: "user" },
        },
      });

      setState((s) => ({ ...s, loading: false }));

      if (error) {
        return { error: error.message };
      }

      if (!data?.user) {
        return { error: "Please confirm your email." };
      }

      return {};
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return { error: e.message };
    }
  }

  // logout
  async function logout() {
    await supabase.auth.signOut();
    setState((s) => ({ ...s, user: null }));
    navigate("/");
  }

  const isAuthenticated = Boolean(state.user);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
        fetchUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}