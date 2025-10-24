import { useEffect, useMemo, useState } from "react";
import { PenSquare, Trash2 } from "lucide-react";
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

  // ---- delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this article?")) return;

    // optimistic remove
    const old = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      console.error("Delete failed:", error);
      toast.error(error.message || "Delete failed");
      // rollback visual
      setRows(old);
      return;
    }

    toast.success("Deleted");
    // hard refresh to be 100% sure
    fetchRows();
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
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
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
        <div className="flex gap-4 mb-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title/description/content…"
            className="w-full py-3 rounded-sm"
          />
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

        {/* Table */}
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
                      onClick={() => handleDelete(r.id)}
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
      </main>
    </div>
  );
}