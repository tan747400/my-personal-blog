import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminEditCategoryPage() {
  const params = useParams();
  const rawId = params.categoryId ?? params.id ?? params.cid ?? "";
  const cid = parseInt(rawId, 10);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // dialog (ตามสไตล์ที่ต้องการ)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(cid)) {
      setErr("Invalid category id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data, error } = await supabase
          .from("categories")
          .select("id,name")
          .eq("id", cid)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        if (!data) {
          setErr("Category not found");
          setName("");
        } else {
          setName(data.name ?? "");
        }
      } catch (e) {
        setErr(e?.message || "Load category failed");
        toast.error(e?.message || "Load category failed");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [cid]);

  const save = async () => {
    if (!Number.isFinite(cid)) return toast.error("Invalid category id");
    if (!name.trim()) return toast.error("Name is required");

    const { error } = await supabase
      .from("categories")
      .update({ name: name.trim() })
      .eq("id", cid);

    if (error) return toast.error(error.message);
    toast.success("Saved");
    navigate("/admin/category-management");
  };

  const confirmDelete = async () => {
    if (!Number.isFinite(cid)) return toast.error("Invalid category id");
    setDeleting(true);
    const { error } = await supabase.from("categories").delete().eq("id", cid);
    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }
    toast.success("Deleted");
    setDeleting(false);
    setIsDialogOpen(false);
    navigate("/admin/category-management");
  };

  if (!Number.isFinite(cid)) {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 p-8">Invalid category id</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Edit Category</h2>
          <Button
            className="cursor-pointer px-8 py-2 rounded-full"
            onClick={save}
            disabled={loading}
          >
            Save
          </Button>
        </div>

        {err ? (
          <div className="text-red-600">{err}</div>
        ) : (
          <div className="space-y-7 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category Name
              </label>
              <Input
                placeholder="Category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 py-3 rounded-sm"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsDialogOpen(true)}
          className="underline underline-offset-2 hover:text-muted-foreground text-sm font-medium flex items-center gap-1 mt-6 cursor-pointer"
          disabled={loading}
        >
          <Trash2 className="h-5 w-5" />
          Delete Category
        </button>
      </main>

      {/* Confirm delete modal — UI เดียวกับตัวอย่าง */}
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
              onClick={() => setIsDialogOpen(false)}
              className="cursor-pointer rounded-full border border-foreground bg-background px-10 py-4 text-foreground transition-colors hover:border-muted-foreground hover:text-muted-foreground"
              disabled={deleting}
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