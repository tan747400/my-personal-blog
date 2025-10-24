import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/db";
import { PenSquare, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

export default function AdminCategoryManagementPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  // โหลดหมวดหมู่
  useEffect(() => {
    (async () => {
      let query = supabase.from("categories").select("id,name").order("id");
      if (q.trim()) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (error) console.error(error);
      setRows(data ?? []);
    })();
  }, [q]);

  // ลบหมวด
  const remove = async (id) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Category management</h2>
          <Button
            className="px-8 py-2 rounded-full cursor-pointer" // ✅ เพิ่ม pointer
            onClick={() => navigate("/admin/category-management/create")}
          >
            <PenSquare className="mr-2 h-4 w-4 cursor-pointer" /> {/* ✅ เพิ่ม */}
            Create category
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search category..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-md py-3 rounded-sm"
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Category</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right flex justify-end space-x-2">
                  {/* ปุ่มแก้ไข */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/admin/category-management/edit/${r.id}`)
                    }
                  >
                    <PenSquare className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                  </Button>

                  {/* ปุ่มลบ */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="h-4 w-4 cursor-pointer hover:text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>No data</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </main>
    </div>
  );
}