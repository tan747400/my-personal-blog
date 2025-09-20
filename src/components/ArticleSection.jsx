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

const API_URL = "https://blog-post-project-api.vercel.app/posts";
const CATEGORIES = ["Highlight", "Cat", "Inspiration", "General"];
const LIMIT = 6;

/* ---------- Spinner กลม ๆ ---------- */
function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
      <p className="mt-2 text-stone-700">{label}</p>
    </div>
  );
}

export default function ArticleSection() {
  const [category, setCategory] = useState("Highlight");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // ใช้ตัวเดียวคุมทั้งแรกเข้า/โหลดเพิ่ม
  const [error, setError] = useState("");

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // ดึงข้อมูลตาม page + category
  const fetchPosts = async (reset = false) => {
    setIsLoading(true);
    try {
      const params =
        category === "Highlight"
          ? { page, limit: LIMIT }
          : { page, limit: LIMIT, category };

      const res = await axios.get(API_URL, { params });
      const data = (res.data?.posts ?? []).map((p) => ({
        ...p,
        date: formatDate(p.date),
      }));

      setPosts((prev) => (reset ? data : [...prev, ...data]));

      const { currentPage, totalPages } = res.data ?? {};
      setHasMore(currentPage < totalPages);
      setError("");
    } catch (e) {
      console.error(e);
      setError("Failed to load posts.");
    } finally {
      setIsLoading(false);
    }
  };

  // เปลี่ยนหมวด: รีเซ็ตหน้า+ลิสต์ แล้วโหลดใหม่
  const handleChangeCategory = (name) => {
    if (name === category) return;
    setCategory(name);
    setPage(1);
    setPosts([]);
    setHasMore(true);
    setError("");
  };

  // โหลดหน้าแรกเมื่อหมวดเปลี่ยน
  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // โหลดเพิ่มเมื่อ page เพิ่ม (ยกเว้นตอนรีเซ็ต)
  useEffect(() => {
    if (page > 1) fetchPosts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) setPage((p) => p + 1);
  };

  return (
    <section className="mt-12 md:mt-16">
      <h2 className="px-6 text-2xl md:text-[28px] font-extrabold tracking-tight text-stone-900">
        Latest articles
      </h2>

      {/* ===== Desktop Toolbar ===== */}
      <div className="mt-5 hidden md:block">
        <div className="mx-6 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          <div className="flex items-center justify-between gap-6">
            <ul className="flex flex-wrap items-center gap-3 md:gap-6">
              {CATEGORIES.map((name) => {
                const isActive = category === name;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => handleChangeCategory(name)}
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

            {/* search (UI อย่างเดียว) */}
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
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          </div>

          <div className="space-y-2">
            <label className="block text-stone-700">Category</label>
            <Select value={category} onValueChange={handleChangeCategory}>
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

      {/* ===== Grid ===== */}
      <div className="mx-4 mt-8 grid min-h-[400px] grid-cols-1 gap-x-6 gap-y-10 md:mx-6 md:grid-cols-2">
        {isLoading && posts.length === 0 && (
          <div className="col-span-full">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading &&
          posts.map((p) => (
            <BlogCard
              key={p.id}
              image={p.image}
              category={p.category}
              title={p.title}
              description={p.description}
              author={p.author}
              date={p.date}
            />
          ))}

        {!isLoading && posts.length === 0 && (
          <p className="col-span-full text-center text-stone-600">No posts found.</p>
        )}

        {error && !isLoading && (
          <p className="col-span-full text-center text-red-500">{error}</p>
        )}
      </div>

      {/* ===== View more ===== */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="mx-auto flex items-center justify-center gap-2 rounded-full border border-stone-400 px-6 py-3 text-sm font-medium hover:bg-stone-100 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
                Loading...
              </>
            ) : (
              "View more"
            )}
          </button>
        </div>
      )}
    </section>
  );
}