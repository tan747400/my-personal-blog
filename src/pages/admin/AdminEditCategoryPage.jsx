import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

export default function AdminEditCategoryPage() {
  const params = useParams();
  const rawId = params.categoryId ?? params.id ?? params.cid ?? "";
  const cid = parseInt(rawId, 10);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  const remove = async () => {
    if (!Number.isFinite(cid)) return toast.error("Invalid category id");
    if (!confirm("Delete this category?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", cid);
    if (error) return toast.error(error.message);

    toast.success("Deleted");
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
            className="px-8 py-2 rounded-full cursor-pointer"
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
          onClick={remove}
          className="underline underline-offset-2 hover:text-muted-foreground text-sm font-medium flex items-center gap-1 mt-6 cursor-pointer"
          disabled={loading}
        >
          <Trash2 className="h-5 w-5" />
          Delete Category
        </button>
      </main>
    </div>
  );
}