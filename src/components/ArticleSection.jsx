import { useState, useEffect } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import BlogCard from "./BlogCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

const CATEGORIES = ["Highlight", "Cat", "Inspiration", "General"];
const API_URL = "https://blog-post-project-api.vercel.app/posts";

export default function ArticleSection() {
  const [category, setCategory] = useState("Highlight");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // แปลงวันที่ ISO → 11 September 2024
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // โหลดโพสต์
  const fetchPosts = async (reset = false) => {
    setIsLoading(true);
    try {
      const params =
        category === "Highlight"
          ? { page, limit: 6 }
          : { page, limit: 6, category };

      const res = await axios.get(API_URL, { params });

      const data = (res.data?.posts ?? []).map((p) => ({
        ...p,
        date: formatDate(p.date),
      }));

      if (reset) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }

      if (res.data.currentPage >= res.data.totalPages) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดใหม่เมื่อ category เปลี่ยน
  useEffect(() => {
    setPage(1);
    fetchPosts(true);
  }, [category]);

  // โหลดเพิ่มเมื่อ page เปลี่ยน
  useEffect(() => {
    if (page > 1) fetchPosts();
  }, [page]);

  const handleLoadMore = () => setPage((prev) => prev + 1);

  return (
    <section className="mt-12 md:mt-16">
      <h2 className="px-6 text-2xl md:text-[28px] font-extrabold tracking-tight text-stone-900">
        Latest articles
      </h2>

      {/* ===== Desktop Toolbar ===== */}
      <div className="mt-5 hidden md:block">
        <div className="mx-6 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          <div className="flex items-center justify-between gap-6">
            {/* Filter */}
            <ul className="flex flex-wrap items-center gap-3 md:gap-6">
              {CATEGORIES.map((name) => {
                const isActive = category === name;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setCategory(name)}
                      disabled={isActive}
                      className={[
                        "rounded-xl px-4 py-2 text-[15px] font-medium transition-colors",
                        isActive
                          ? "bg-stone-400/50 text-stone-800 cursor-default"
                          : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-800",
                      ].join(" ")}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Search (UI อย่างเดียว) */}
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile Toolbar ===== */}
      <div className="mt-5 md:hidden">
        <div className="mx-4 space-y-5 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          </div>

          {/* Select Category */}
          <div className="space-y-2">
            <label className="block text-stone-700">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v)}>
              <SelectTrigger className="w-full rounded-xl border border-stone-300 bg-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ===== Grid of Blog Cards ===== */}
      <div className="mx-4 mt-8 grid grid-cols-1 gap-x-6 gap-y-10 md:mx-6 md:grid-cols-2">
        {isLoading && posts.length === 0 && (
          <p className="col-span-full text-center text-stone-500">Loading...</p>
        )}
        {!isLoading &&
          posts.map((p) => (
            <BlogCard
              key={p.id}
              id={p.id}           // ✅ ส่ง id เข้าไปด้วย
              image={p.image}
              category={p.category}
              title={p.title}
              description={p.description}
              author={p.author}
              date={p.date}
            />
          ))}
      </div>

      {/* ===== View More ===== */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="hover:text-muted-foreground font-medium underline"
          >
            {isLoading ? "Loading..." : "View more"}
          </button>
        </div>
      )}
    </section>
  );
}