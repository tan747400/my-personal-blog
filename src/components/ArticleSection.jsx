// src/components/ArticleSection.jsx
import { Search, ChevronDown } from "lucide-react";

const CATEGORIES = ["Highlight", "Cat", "Inspiration", "General"];

export default function ArticleSection() {
  return (
    <section className="mt-12 md:mt-16">
      {/* Desktop */}
      <div className="mt-5 hidden md:block">
        <div className="mx-6 rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
          <div className="flex items-center justify-between gap-6">
            <ul className="flex flex-wrap items-center gap-6">
              {CATEGORIES.map((name, i) => (
                <li key={name}>
                  <button
                    type="button"
                    className={
                      i === 0
                        ? "rounded-xl px-4 py-2 text-[15px] font-medium bg-stone-300/80 text-stone-800"
                        : "rounded-xl px-4 py-2 text-[15px] font-medium text-stone-600 hover:text-stone-800"
                    }
                    aria-current={i === 0 ? "true" : undefined}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>

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

      {/* Mobile */}
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
            <div className="relative">
              <select
                defaultValue={CATEGORIES[0]}
                className="w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 py-3 pr-10 text-[15px] text-stone-800 outline-none focus:ring-2 focus:ring-stone-200"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}