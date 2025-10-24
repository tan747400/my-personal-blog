import { useEffect, useState, useMemo } from "react";
import supabase from "@/lib/db";
import { toast } from "sonner";

export default function LatestArticles() {
  const [posts, setPosts] = useState([]);
  const [cats, setCats] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const catMap = useMemo(() => {
    const m = new Map();
    cats.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [cats]);

  const publishId = useMemo(() => {
    const p = statuses.find((s) => s.status?.toLowerCase() === "publish");
    return p?.id || null;
  }, [statuses]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        const [{ data: cs }, { data: sts }] = await Promise.all([
          supabase.from("categories").select("id,name").order("id"),
          supabase.from("statuses").select("id,status").order("id"),
        ]);
        if (!active) return;
        setCats(cs ?? []);
        setStatuses(sts ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Load master data failed");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!publishId) return; // ยังไม่รู้ publishId
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id,title,description,date,image,category_id,status_id")
          .eq("status_id", publishId)
          .order("date", { ascending: false });

        if (error) throw error;
        if (!active) return;

        setPosts(
          (data ?? []).map((p) => ({
            ...p,
            categoryName: catMap.get(p.category_id) || "-",
          }))
        );
      } catch (e) {
        console.error(e);
        toast.error("Load posts failed");
      }
    })();

    return () => {
      active = false;
    };
  }, [publishId, catMap]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <section className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Latest articles</h2>
      <ul className="space-y-8">
        {posts.map((p) => (
          <li key={p.id} className="rounded-2xl border bg-white overflow-hidden">
            {p.image && (
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-[320px] object-cover"
              />
            )}
            <div className="p-4">
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800">
                {p.categoryName}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{p.title}</h3>
              <p className="mt-1 text-stone-600">{p.description}</p>
            </div>
          </li>
        ))}
        {!posts.length && <li className="text-stone-500">No articles.</li>}
      </ul>
    </section>
  );
}