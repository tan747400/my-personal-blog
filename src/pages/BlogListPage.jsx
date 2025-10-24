import { useEffect, useState } from "react";
import supabase from "@/lib/db";
import BlogCard from "@/components/ui/BlogCard";

export default function BlogListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          image,
          title,
          description,
          date,
          categories:categories!posts_category_id_fkey ( name ),
          author:users!posts_user_id_fkey!inner ( id, name, username, profile_pic )
        `)
        .order("date", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((p) => ({
        id: p.id,
        image: p.image,
        title: p.title,
        description: p.description,
        date: p.date,
        category: p.categories?.name || "",
        authorName: p.author?.name || p.author?.username || "Unknown",
        authorPic: p.author?.profile_pic || "",
      }));

      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-12 text-center">Loading…</div>;

  if (!items.length)
    return (
      <div className="py-12 text-center text-stone-500">
        ไม่มีบทความที่มีผู้เขียนอยู่ในระบบ
      </div>
    );

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <BlogCard key={it.id} {...it} />
      ))}
    </div>
  );
}