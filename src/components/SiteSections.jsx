import {
  Linkedin,
  Github,
  Globe,
  Mail,
  Menu,
  ChevronDown,
  User,
  Key,
  LayoutDashboard,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/authentication";
import supabase from "@/lib/db";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import CircleAvatar from "@/components/CircleAvatar";
import { motion } from "framer-motion";

/* ------------------- Motion Config ------------------- */
const ease = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ------------------- NavBar ------------------- */
export function NavBar() {
  const navigate = useNavigate();
  const { state, logout } = useAuth();

  const user = state?.user;
  const isLoggedIn = !!user;

  // อ่านจาก metadata (fallback เท่านั้น)
  const roleFromMeta = user?.user_metadata?.role || null;

  // อ่านจาก DB เสมอ
  const [dbRole, setDbRole] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      if (!user?.id) {
        if (alive) setDbRole(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (alive) setDbRole(error ? null : data?.role ?? null);
    }

    loadRole();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // ใช้ role จาก DB เป็นหลัก ถ้าไม่มีค่อยตกไป meta
  const effectiveRole =
    (dbRole ?? roleFromMeta)?.toString().toLowerCase() || null;
  const isAdmin = effectiveRole === "admin";

  const avatarUrl =
    user?.user_metadata?.profile_pic ||
    user?.user_metadata?.avatar_url ||
    "";

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Account";

  const initials =
    (displayName?.match(/[A-Za-zก-ฮ0-9]/g) || [])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <nav aria-label="Primary" className="w-full border-b border-stone-200 bg-white">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="text-3xl font-extrabold tracking-tight text-stone-800 hover:opacity-80 transition"
        >
          Thomson P<span className="text-green-500">•</span>
        </Link>

        {isLoggedIn ? (
          <div className="hidden md:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-3 rounded-full border border-stone-300 px-5 py-2.5 hover:bg-stone-50 transition cursor-pointer">
                <CircleAvatar
                  src={avatarUrl || undefined}
                  alt={displayName}
                  size={44}
                  className="shadow-sm"
                  fallback={<span className="text-[11px] font-semibold">{initials}</span>}
                />
                <span className="text-base font-medium max-w-[180px] truncate cursor-pointer select-none">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="mt-2 rounded-xl">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate("/profile")}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate("/reset-password")}
                  className="cursor-pointer"
                >
                  <Key className="h-4 w-4 mr-2" /> Reset password
                </DropdownMenuItem>

                {/* โชว์เฉพาะ Admin */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => navigate("/admin/article-management")}
                      className="cursor-pointer text-indigo-700 font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={logout}
                  className="cursor-pointer text-red-600"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="rounded-full border border-stone-300 px-5 py-1.5 text-xl font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/sign-up")}
              className="rounded-full bg-stone-900 px-5 py-1.5 text-xl font-semibold text-white hover:bg-stone-800 transition cursor-pointer"
            >
              Sign up
            </button>
          </div>
        )}

        {/* Mobile */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open menu"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 p-2.5 hover:bg-stone-50 transition cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="mt-2 rounded-xl min-w-[200px]">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-2">
                    <CircleAvatar
                      src={avatarUrl || undefined}
                      alt={displayName}
                      size={36}
                      fallback={<span className="text-[10px]">{initials}</span>}
                    />
                    <span className="text-base font-medium max-w-[140px] truncate">
                      {displayName}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => navigate("/profile")}
                    className="cursor-pointer"
                  >
                    <User className="h-4 w-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => navigate("/reset-password")}
                    className="cursor-pointer"
                  >
                    <Key className="h-4 w-4 mr-2" /> Reset password
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem
                      onSelect={() => navigate("/admin/article-management")}
                      className="cursor-pointer text-indigo-700 font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={logout}
                    className="cursor-pointer text-red-600"
                  >
                    Log out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onSelect={() => navigate("/login")}
                    className="cursor-pointer"
                  >
                    Log in
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => navigate("/sign-up")}
                    className="cursor-pointer"
                  >
                    Sign up
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

/* ------------------- HeroSection ------------------- */
export function HeroSection() {
  return (
    <section className="bg-white py-[60px] md:py-[80px]">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto_1fr] px-[24px] md:px-[60px]"
      >
        <motion.div variants={fadeUp} className="text-center md:text-left">
          <h1 className="text-[48px] md:text-[56px] font-extrabold leading-[1.05] tracking-tight text-stone-900">
            Stay <span className="block">Informed,</span>
            <span className="block">Stay Inspired</span>
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-stone-600 max-w-[340px] mx-auto md:mx-0">
            Discover a World of Knowledge at Your Fingertips. Your Daily Dose of Inspiration
            and Information.
          </p>
        </motion.div>

        <motion.figure
          variants={fadeUp}
          className="mx-auto overflow-hidden rounded-[24px] border border-stone-200 shadow-lg w-[360px] md:w-[386px]"
        >
          <img
            src="/profile.jpg"
            alt="Author with a cat"
            className="aspect-[4/5] w-full object-cover"
          />
        </motion.figure>

        <motion.aside variants={fadeUp} className="text-left">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-6 md:p-7 max-w-[360px]">
            <p className="text-xs uppercase tracking-wide text-stone-500">– Author</p>
            <h3 className="mt-1 text-xl font-semibold text-stone-900">Thompson P.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
              I am a pet enthusiast and freelance writer who specializes in animal behavior
              and care. With a deep love for cats, I enjoy sharing insights on feline
              companionship and wellness.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-stone-600">
              When I’m not writing, I spend time volunteering at my local animal shelter,
              helping cats find loving homes.
            </p>
          </div>
        </motion.aside>
      </motion.div>
    </section>
  );
}

/* ------------------- Footer ------------------- */
export function Footer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-6 py-6">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <span className="text-stone-900 text-xl font-bold">Get in touch</span>
          <a
            href="https://linkedin.com"
            className="inline-flex hover:opacity-80 transition"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="https://github.com"
            className="inline-flex hover:opacity-80 transition"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="/"
            className="inline-flex hover:opacity-80 transition"
            aria-label="Website"
          >
            <Globe className="h-5 w-5" />
          </a>
          <a
            href="mailto:example@mail.com"
            className="inline-flex hover:opacity-80 transition"
            aria-label="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
        <a
          href="/"
          className="text-stone-900 underline underline-offset-4 hover:no-underline text-xl font-bold"
        >
          Home page
        </a>
      </div>
    </div>
  );
}