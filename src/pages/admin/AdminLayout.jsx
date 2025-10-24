import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminWebSection";

/** เลย์เอาต์หลักของโซน /admin */
export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
