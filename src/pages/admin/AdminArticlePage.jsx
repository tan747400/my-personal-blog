import { useEffect, useMemo, useState } from "react";
import { PenSquare, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/db";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

export default function AdminArticleManagementPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("0");
  const [statusFilter, setStatusFilter] = useState("0");

  // popup ลบ
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ---- helpers: map
  const catMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const statusMap = useMemo(() => {
    const m = new Map();
    statuses.forEach((s) => m.set(s.id, s.status));
    return m;
  }, [statuses]);

  // ---- initial lists
  useEffect(() => {
    (async () => {
      try {
        const [{ data: cats, error: cErr }, { data: sts, error: sErr }] =
          await Promise.all([
            supabase.from("categories").select("id,name").order("id"),
            supabase.from("statuses").select("id,status").order("id"),
          ]);
        if (cErr) throw cErr;
        if (sErr) throw sErr;
        setCategories(cats ?? []);
        setStatuses(sts ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Load master data failed");
      }
    })();
  }, []);

  // ---- load grid
  const fetchRows = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("posts")
        .select("id,title,category_id,status_id,date", { count: "exact" })
        .order("date", { ascending: false });

      if (q.trim()) {
        query = query.or(
          `title.ilike.%${q}%,description.ilike.%${q}%,content.ilike.%${q}%`
        );
      }
      if (catFilter !== "0") query = query.eq("category_id", Number(catFilter));
      if (statusFilter !== "0")
        query = query.eq("status_id", Number(statusFilter));

      const { data, error } = await query;
      if (error) throw error;

      setRows(
        (data ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          category: catMap.get(r.category_id) || "-",
          statusRaw: statusMap.get(r.status_id) || "",
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error("Load articles failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, catFilter, statusFilter, catMap, statusMap]);

  // ---- ask delete (เปิด popup)
  const askDelete = (id) => {
    setTargetDeleteId(id);
    setIsDialogOpen(true);
  };

  // ---- confirm delete (ลบจริง)
  const confirmDelete = async () => {
    if (!targetDeleteId) return;
    setDeleting(true);

    // optimistic remove
    const prev = rows;
    setRows((cur) => cur.filter((r) => r.id !== targetDeleteId));

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", targetDeleteId);

      if (error) {
        setRows(prev); // rollback
        throw error;
      }

      toast.success("Article deleted");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
      setIsDialogOpen(false);
      setTargetDeleteId(null);
      // ดึงใหม่เพื่อความชัวร์ (ในกรณี filter / count อื่นๆ)
      fetchRows();
    }
  };

  // ---- badge
  const renderStatusBadge = (statusRaw) => {
    if (!statusRaw) return "-";
    const s = String(statusRaw).toLowerCase();
    const label = s.charAt(0).toUpperCase() + s.slice(1);

    if (s === "publish" || s === "published") {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Publish
        </span>
      );
    }
    if (s === "draft") {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
        {label}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      {/* ทำให้คอลัมน์เนื้อหาสามารถสกรอล์ได้แน่ๆ */}
      <main className="flex-1 h-screen overflow-y-auto p-8 bg-gray-50">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Article management</h2>
          <Button
            className="px-8 py-2 rounded-full cursor-pointer"
            onClick={() => navigate("/admin/article-management/create")}
          >
            <PenSquare className="mr-2 h-4 w-4 cursor-pointer" />
            Create article
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title/description/content…"
            className="w-full md:flex-1 py-3 rounded-sm"
          />

          <div className="flex items-center gap-2">
            <span className="py-2 font-medium text-stone-700">Category</span>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px] py-3 rounded-sm cursor-pointer">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="py-2 font-medium text-stone-700">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] py-3 rounded-sm cursor-pointer">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {String(s.status).charAt(0).toUpperCase() +
                      String(s.status).slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="pb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Article title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4}>Loading…</TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{renderStatusBadge(r.statusRaw)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/admin/article-management/edit/${r.id}`)
                        }
                      >
                        <PenSquare className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => askDelete(r.id)}
                      >
                        <Trash2 className="h-4 w-4 cursor-pointer hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>No data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Confirm delete modal (reuse style from Reset password) */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-white rounded-md pt-16 pb-6 max-w-[22rem] sm:max-w-md flex flex-col items-center">
          <AlertDialogTitle className="text-3xl font-semibold pb-2 text-center">
            Delete article
          </AlertDialogTitle>

          <AlertDialogDescription className="mb-4 text-center font-medium text-muted-foreground">
            Are you sure you want to delete this article?
          </AlertDialogDescription>

          <div className="flex flex-row gap-4">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="cursor-pointer bg-background px-10 py-4 rounded-full text-foreground border border-foreground hover:border-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="cursor-pointer rounded-full text-white bg-foreground hover:bg-muted-foreground transition-colors py-4 text-lg px-10 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>

          <AlertDialogCancel className="cursor-pointer absolute right-4 top-2 sm:top-4 p-1 border-none">
            <X className="h-6 w-6" />
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}