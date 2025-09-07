export default function NavBar() {
    return (
      <nav
        aria-label="Primary"
        className="rounded-2xl border border-stone-200 shadow-sm"
      >
        <div className="flex items-center justify-between px-3 py-2 md:px-5 md:py-3">
          {/* Brand */}
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xl font-semibold tracking-tight text-stone-800 md:text-2xl"
            aria-label="Home"
          >
            <span className="font-bold">hh.</span>
          </a>
  
          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 active:scale-[.99] transition"
              aria-label="Log in"
            >
              Log in
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-800 active:scale-[.99] transition"
              aria-label="Sign up"
            >
              Sign up
            </button>
          </div>
        </div>
      </nav>
    );
  }
  