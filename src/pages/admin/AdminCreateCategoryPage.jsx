import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

export default function AdminCreateCategoryPage() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const save = async () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);

      // ตรวจสอบว่ามี category ซ้ำไหม
      const { data: exists } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", name.trim())
        .maybeSingle();

      if (exists) {
        toast.error("This category name already exists");
        setSaving(false);
        return;
      }

      // บันทึกข้อมูล
      const { error } = await supabase.from("categories").insert([{ name: name.trim() }]);
      if (error) throw error;

      toast.success("Category created successfully");
      navigate("/admin/category-management");
    } catch (err) {
      console.error("Create category failed:", err.message);
      toast.error(err.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Create Category</h2>
          <Button
            className="cursor-pointer px-8 py-2 rounded-full"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="space-y-7 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Category Name</label>
            <Input
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 py-3 rounded-sm"
            />
          </div>
        </div>
      </main>
    </div>
  );
}