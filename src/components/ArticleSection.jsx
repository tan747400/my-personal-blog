import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export default function ArticleSection() {
  // Category (ของเดิม) 
  const [category, setCategory] = useState("Highlight");

  // โพสต์บนหน้า (ของเดิมจาก Fetching/Pagination) 
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // state สำหรับ Search (ใหม่)
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // helper แปลงวันที่
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // โหลดโพสต์หลัก (ตาม category + page) 
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const params =
          category === "Highlight"
            ? { page, limit: 6 }
            : { page, limit: 6, category };

        const { data } = await axios.get(API_URL, { params });
        const mapped = (data?.posts ?? []).map((p) => ({
          ...p,
          date: formatDate(p.date),
        }));

        // ถ้า page = 1 คือเปลี่ยน category → รีเซ็ตโพสต์
        if (page === 1) {
          setPosts(mapped);
        } else {
          setPosts((prev) => [...prev, ...mapped]);
        }

        // เช็คมีหน้าเหลือไหม
        if (data.currentPage >= data.totalPages) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [category, page]);

  // เมื่อเปลี่ยน category ให้รีเซ็ต page/โพสต์
  useEffect(() => {
    setPage(1);
  }, [category]);

  // Debounce Search 
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(API_URL, {
          params: { keyword: query.trim(), limit: 6 }, // ค้นหา title/desc/content
        });
        setSearchResults(data?.posts ?? []);
        setShowDropdown(true);
      } catch (e) {
        console.error(e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350); // debounce 350ms

    return () => clearTimeout(t);
  }, [query]);

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // โหลดเพิ่ม (View more)
  const handleLoadMore = () => setPage((p) => p + 1);

  //  UI 
  return (
    <section className="mt-12 md:mt-16">
      <h2 className="px-6 text-2xl md:text-[28px] font-extrabold tracking-tight text-stone-900">
        Latest articles
      </h2>

      {/* Desktop toolbar  */}
      <div className="mt-5 hidden md:block">
        <div className="mx-6 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          <div className="flex items-center justify-between gap-6">
            {/* categories */}
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

            {/* search box + dropdown */}
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

              {/* dropdown */}
              {showDropdown && (
                <div className="absolute z-50 mt-2 w-full rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                  {isSearching && (
                    <div className="px-3 py-2 text-sm text-stone-500">
                      Searching…
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-sm text-stone-500">
                      No results
                    </div>
                  )}
                  {!isSearching &&
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full rounded-lg px-3 py-3 text-left text-[15px] hover:bg-stone-100"
                        onMouseDown={() => {
                          // ใช้ onMouseDown กัน blur ก่อน navigate
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

      {/*  Mobile toolbar  */}
      <div className="mt-5 md:hidden">
        <div className="mx-4 space-y-5 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          {/* search mobile (แชร์ state เดียวกัน) */}
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setShowDropdown(true)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-10 text-[15px] text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-200"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />

            {showDropdown && (
              <div className="absolute z-50 mt-2 w-full rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                {isSearching && (
                  <div className="px-3 py-2 text-sm text-stone-500">
                    Searching…
                  </div>
                )}
                {!isSearching && searchResults.length === 0 && (
                  <div className="px-3 py-2 text-sm text-stone-500">
                    No results
                  </div>
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

          {/* select category */}
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

      {/*  Grid of posts*/}
      <div className="mx-4 mt-8 grid grid-cols-1 gap-x-6 gap-y-10 md:mx-6 md:grid-cols-2">
        {posts.map((p) => (
          <BlogCard
            key={p.id}
            id={p.id}                 // <= ส่ง id ไป BlogCard ด้วย (สำหรับลิงก์)
            image={p.image}
            category={p.category}
            title={p.title}
            description={p.description}
            author={p.author}
            date={p.date}
          />
        ))}
      </div>

      {/* View more */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-full border border-stone-300 px-6 py-2 font-medium hover:bg-stone-50 disabled:opacity-60"
          >
            {loading ? "Loading..." : "View more"}
          </button>
        </div>
      )}
    </section>
  );
}