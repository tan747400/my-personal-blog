import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import BlogCard from "./BlogCard";
import blogPosts from "../data/blogPosts";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select"; // 👈 relative path

const CATEGORIES = ["Highlight", "Cat", "Inspiration", "General"];

export default function ArticleSection() {
  // ค่าเริ่มต้นต้องเป็น Highlight
  const [category, setCategory] = useState("Highlight");

  // กรองโพสต์ (Highlight = ทั้งหมด)
  const filteredPosts = useMemo(() => {
    if (category === "Highlight") return blogPosts.slice(0, 6);
    return blogPosts.filter((p) => p.category === category).slice(0, 6);
  }, [category]);

  return (
    <section className="mt-12 md:mt-16">
      <h2 className="px-6 text-2xl md:text-[28px] font-extrabold tracking-tight text-stone-900">
        Latest articles
      </h2>

      {/* Desktop Toolbar */}
      <div className="mt-5 hidden md:block">
        <div className="mx-6 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          <div className="flex items-center justify-between gap-6">
            {/* ปุ่ม Filter */}
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

            {/* Search (UI เท่านั้น) */}
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

      {/* Mobile Toolbar */}
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

          {/* Select ของ shadcn/ui */}
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

      {/* Grid แสดงบทความ */}
      <div className="mx-4 mt-8 grid grid-cols-1 gap-x-6 gap-y-10 md:mx-6 md:grid-cols-2">
        {filteredPosts.map((p) => (
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
      </div>
    </section>
  );
}