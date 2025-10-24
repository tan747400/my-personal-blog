import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import supabase from "@/lib/db";

export default function AdminGate({ children }) {
  const [state, setState] = useState({ checking: true, allow: false });
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1) ต้องมี session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setState({ checking: false, allow: false });
        return;
      }

      // 2) อ่าน role จาก public.users โดยใช้ id = auth.uid()
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[AdminGate] role query error:", error);
        if (alive) setState({ checking: false, allow: false });
        return;
      }

      const isAdmin = (data?.role || "").toLowerCase() === "admin";
      if (alive) setState({ checking: false, allow: isAdmin });
    })();

    return () => { alive = false; };
  }, []);

  if (state.checking) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
        <p className="text-stone-700">Checking admin permission…</p>
      </div>
    );
  }

  // ถ้าห้ามเข้าก็ส่งกลับหน้าแรก (หรือจะส่งไป /admin/login ก็ได้)
  if (!state.allow) {
    // ถ้ายังไม่ล็อกอินอยากส่งไปหน้า login ฝั่ง admin:
    // return <Navigate to="/admin/login" replace state={{ from: location }} />;
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}