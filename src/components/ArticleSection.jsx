import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import supabase from "@/lib/db";
import BlogCard from "./BlogCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

const PAGE_SIZE = 6;
const DEFAULT_AVATAR = "/avatar-default.svg";

export default function ArticleSection() {
  // ----- State
  const [tabs, setTabs] = useState([{ id: 0, label: "All" }]);
  const [categoryId, setCategoryId] = useState(0);

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const [publishId, setPublishId] = useState(undefined);

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";

  // ----- Load categories -> tabs
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name")
        .order("id");
      if (error) return console.error("[categories]", error);
      if (!alive) return;
      setTabs([{ id: 0, label: "All" }, ...(data ?? []).map((c) => ({ id: c.id, label: c.name }))]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ----- Get publish status id
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("statuses").select("id,status");
      if (error) {
        console.error("[statuses]", error);
        setPublishId(null);
        return;
      }
      const row = (data || []).find((s) => String(s.status).toLowerCase() === "publish");
      setPublishId(row?.id ?? null);
    })();
  }, []);

  // ----- Load posts (join author + category)
  useEffect(() => {
    if (publishId === undefined) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("posts")
          .select(
            `
            id,
            title,
            description,
            image,
            date,
            likes_count,
            category_id,
            categories:categories!posts_category_id_fkey ( name ),
            author:users!posts_user_id_fkey ( id, name, username, profile_pic )
          `,
            { count: "exact" }
          )
          .eq("status_id", publishId)
          .order("date", { ascending: false });

        if (categoryId !== 0) q = q.eq("category_id", categoryId);

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);

        const { data, error, count } = await q;
        if (error) throw error;

        const mapped = (data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          image: p.image || DEFAULT_AVATAR,
          date: formatDate(p.date),
          category: p.categories?.name || "General",
          authorName: p.author?.name || p.author?.username || "Unknown",
          authorPic: p.author?.profile_pic || DEFAULT_AVATAR,
        }));

        if (!alive) return;
        if (page === 1) setPosts(mapped);
        else setPosts((prev) => [...prev, ...mapped]);

        const total = count ?? 0;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        setHasMore(page < totalPages);
      } catch (e) {
        console.error("[posts load]", e);
        if (alive) {
          setPosts([]);
          setHasMore(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, categoryId, publishId]);

  // Reset page on category change
  useEffect(() => setPage(1), [categoryId]);

  // ----- Search (debounce)
  useEffect(() => {
    if (publishId === undefined) return;

    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        let q = supabase
          .from("posts")
          .select("id,title")
          .eq("status_id", publishId)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(6);

        if (categoryId !== 0) q = q.eq("category_id", categoryId);

        const { data, error } = await q;
        if (error) throw error;

        setSearchResults(data ?? []);
        setShowDropdown(true);
      } catch (e) {
        console.error("[search]", e);
        setSearchResults([]);
        setShowDropdown(true);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [query, categoryId, publishId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLoadMore = () => setPage((p) => p + 1);

  return (
    <section className="mt-12 md:mt-16">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <h2 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-stone-900">
          Latest articles
        </h2>

        {/* ---------- Mobile toolbar: Search + Category ---------- */}
        <div className="mt-5 md:hidden">
          <div className="rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
            {/* Search */}
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query && setShowDropdown(true)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" />

              {showDropdown && (
                <div className="absolute z-50 mt-2 w-full rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                  {isSearching && (
                    <div className="px-3 py-2 text-sm text-stone-500">Searching…</div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-sm text-stone-500">No results</div>
                  )}
                  {!isSearching &&
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full rounded-lg px-3 py-3 text-left text-[15px] hover:bg-stone-100"
                        onMouseDown={() => {
                          setShowDropdown(false);
                          setQuery("");
                          navigate(`/post/${item.id}`);
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="mt-5">
              <label className="mb-2 block text-[15px] font-medium text-stone-700">
                Category
              </label>
              <Select
                value={String(categoryId)}
                onValueChange={(v) => setCategoryId(Number(v))}
              >
                <SelectTrigger className="w-full rounded-xl border border-stone-300 bg-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ---------- Desktop toolbar: Tabs + Search ---------- */}
        <div className="mt-5 hidden md:block">
          <div className="rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
            <div className="flex items-center justify-between gap-6">
              <ul className="flex flex-wrap items-center gap-3 md:gap-6">
                {tabs.map((t) => {
                  const isActive = categoryId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setCategoryId(t.id)}
                        disabled={isActive}
                        className={[
                          "rounded-xl px-4 py-2 text-[15px] font-medium transition-colors",
                          isActive
                            ? "bg-stone-400/50 text-stone-800 cursor-default"
                            : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-800 cursor-pointer",
                        ].join(" ")}
                        aria-current={isActive ? "true" : undefined}
                      >
                        {t.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="relative w-full max-w-sm" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query && setShowDropdown(true)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                {showDropdown && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                    {isSearching && (
                      <div className="px-3 py-2 text-sm text-stone-500">Searching…</div>
                    )}
                    {!isSearching && searchResults.length === 0 && (
                      <div className="px-3 py-2 text-sm text-stone-500">No results</div>
                    )}
                    {!isSearching &&
                      searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="block w-full rounded-lg px-3 py-3 text-left text-[15px] hover:bg-stone-100"
                          onMouseDown={() => {
                            setShowDropdown(false);
                            setQuery("");
                            navigate(`/post/${item.id}`);
                          }}
                        >
                          {item.title}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2">
          {posts.map((p) => (
            <BlogCard
              key={p.id}
              id={p.id}
              image={p.image || DEFAULT_AVATAR}
              category={p.category}
              title={p.title}
              description={p.description}
              date={p.date}
              authorName={p.authorName}
              authorPic={p.authorPic || DEFAULT_AVATAR}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-16 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="rounded-full border border-stone-300 px-6 py-2 font-medium hover:bg-stone-50 disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Loading..." : "View more"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}