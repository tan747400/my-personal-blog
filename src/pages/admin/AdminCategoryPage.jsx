import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/db";
import { PenSquare, Trash2, X } from "lucide-react";

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

/* ใช้ popup แบบเดียวกับหน้า reset password */
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function AdminCategoryManagementPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  // สำหรับ popup ลบ
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // โหลดหมวดหมู่
  useEffect(() => {
    (async () => {
      try {
        let query = supabase.from("categories").select("id,name").order("id");
        if (q.trim()) query = query.ilike("name", `%${q}%`);
        const { data, error } = await query;
        if (error) throw error;
        setRows(data ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load categories");
      }
    })();
  }, [q]);

  // เปิด popup เพื่อลบ
  const openDeleteDialog = (id) => {
    setPendingId(id);
    setIsDialogOpen(true);
  };

  // ยืนยันลบ (กดปุ่มใน popup)
  const confirmDelete = async () => {
    if (!pendingId) return;
    try {
      setDeleting(true);
      // optimistic UI
      const prev = rows;
      setRows((r) => r.filter((x) => x.id !== pendingId));

      const { error } = await supabase.from("categories").delete().eq("id", pendingId);
      if (error) {
        // rollback ถ้าพลาด
        setRows(prev);
        throw error;
      }

      toast.success("Category deleted");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
      setPendingId(null);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      {/* พื้นที่สกรอล์เฉพาะคอลัมน์เนื้อหา */}
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Category management</h2>
          <Button
            className="rounded-full px-8 py-2 cursor-pointer"
            onClick={() => navigate("/admin/category-management/create")}
          >
            <PenSquare className="mr-2 h-4 w-4 cursor-pointer" />
            Create category
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search category..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-md rounded-sm py-3"
          />
        </div>

        {/* Table */}
        <div className="pb-8">
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
                  <TableCell className="flex justify-end space-x-2 text-right">
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

                    {/* ปุ่มลบ -> เปิด popup */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => openDeleteDialog(r.id)}
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
        </div>
      </main>

      {/* Confirm delete modal */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-white rounded-md pt-16 pb-6 max-w-[22rem] sm:max-w-md flex flex-col items-center">
          <AlertDialogTitle className="pb-2 text-center text-3xl font-semibold">
            Delete category
          </AlertDialogTitle>
          <AlertDialogDescription className="mb-2 flex flex-row justify-center text-center font-medium text-muted-foreground">
            Are you sure you want to delete this category?
          </AlertDialogDescription>

          <div className="flex flex-row gap-4">
            <button
              onClick={() => {
                setIsDialogOpen(false);
                setPendingId(null);
              }}
              className="cursor-pointer rounded-full border border-foreground bg-background px-10 py-4 text-foreground transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="cursor-pointer rounded-full bg-foreground px-10 py-4 text-lg text-white transition-colors hover:bg-muted-foreground disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>

          <AlertDialogCancel className="absolute right-4 top-2 p-1 border-none cursor-pointer sm:top-4">
            <X className="h-6 w-6" />
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}