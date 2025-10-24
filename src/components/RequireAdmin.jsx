import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import supabase from "@/lib/db";

/**
 * อนุญาตเฉพาะผู้ใช้ที่มี role = 'admin' ใน public.users
 * - ระหว่างตรวจสอบจะแสดง loading
 * - ถ้าไม่ได้สิทธิ์ จะเด้งกลับหน้าแรก
 */
export default function RequireAdmin({ children }) {
  const [authorized, setAuthorized] = useState(null); // null = checking
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setAuthorized(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id) // ต้องเป็น UUID เดียวกับ auth.uid()
        .maybeSingle();

      if (error) {
        console.error("[RequireAdmin] role query error:", error);
        if (alive) setAuthorized(false);
        return;
      }

      const isAdmin = (data?.role || "").toLowerCase() === "admin";
      if (alive) setAuthorized(isAdmin);
    })();

    return () => { alive = false; };
  }, []);

  if (authorized === null) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
        <p className="text-stone-700">Checking permission…</p>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}