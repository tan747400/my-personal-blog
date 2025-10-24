import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Copy, Facebook, Linkedin, Twitter, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

import supabase from "@/lib/db";
import { useAuth } from "@/contexts/authentication";
import AvatarCircle from "@/components/AvatarCircle";

/* =============== StickyCard: เลื่อนขึ้นลงได้ และรีเซ็ตเมื่อถึงฐาน =============== */
function StickyCard({ offset = 120, trackRef, children }) {
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const [style, setStyle] = useState({ position: "relative", top: 0, width: "auto" });

  useEffect(() => {
    const onUpdate = () => {
      const wrap = wrapRef.current;
      const card = cardRef.current;
      if (!wrap || !card) return;

      const leftEl = trackRef?.current || null;
      const leftH = leftEl ? (leftEl.scrollHeight || leftEl.offsetHeight || 0) : 0;
      const cardH = card.offsetHeight;
      const minH = Math.max(leftH, cardH);
      if (wrap.style.minHeight !== `${minH}px`) wrap.style.minHeight = `${minH}px`;

      const rect = wrap.getBoundingClientRect();
      const scrollTop = window.scrollY || window.pageYOffset;

      const wrapTop = scrollTop + rect.top;
      const wrapBottom = wrapTop + minH;
      const maxFixedTop = wrapBottom - cardH - offset;

      if (scrollTop <= wrapTop - offset) {
        setStyle({ position: "relative", top: 0, width: "auto" });
        return;
      }
      if (scrollTop > wrapTop - offset && scrollTop < maxFixedTop) {
        setStyle({ position: "fixed", top: `${offset}px`, width: `${rect.width}px` });
        return;
      }
      const bottomY = minH - cardH;
      setStyle({ position: "absolute", top: `${bottomY}px`, width: "100%" });
    };

    const ro = new ResizeObserver(onUpdate);
    if (document?.body) ro.observe(document.body);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (cardRef.current) ro.observe(cardRef.current);
    if (trackRef?.current) ro.observe(trackRef.current);

    window.addEventListener("scroll", onUpdate, { passive: true });
    window.addEventListener("resize", onUpdate);
    requestAnimationFrame(onUpdate);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onUpdate);
      window.removeEventListener("resize", onUpdate);
    };
  }, [offset, trackRef]);

  return (
    <div ref={wrapRef} className="relative">
      <div ref={cardRef} style={style}>{children}</div>
    </div>
  );
}

/* ===================== Helpers ===================== */
function toDateFromSupabase(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  if (!hasTZ && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) return new Date(s + "Z");
  return new Date(s);
}

// ใช้กับวันที่ของโพสต์ (รูปแบบ เช่น 23 October 2025)
function fmtBangkokDate(src) {
  const d = toDateFromSupabase(src);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const bkk = new Date(utcMs + 7 * 3600000);
    return bkk.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }
}

// ใช้กับเวลาคอมเมนต์ (รูปแบบ เช่น Oct 21, 2025, 02:13 PM)
function fmtBangkokDateTime(src) {
  const d = toDateFromSupabase(src);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // AM/PM
    }).format(d);
  } catch {
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const bkk = new Date(utcMs + 7 * 3600000);
    return bkk.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
}

/* ===================== Simple modal ===================== */
function SimpleModal({ open, onClose, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="relative rounded-2xl bg-white p-8 text-center shadow-2xl">
          <button
            className="absolute right-4 top-4 rounded p-1 hover:bg-stone-100 cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ===================== Page ===================== */
export default function PostPage() {
  const { postId } = useParams();
  const pid = Number(postId);
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // หมวด & ผู้เขียนจริง
  const [category, setCategory] = useState(null);
  const [author, setAuthor] = useState(null);

  // ref ของคอลัมน์ซ้ายให้ StickyCard อิงความสูง
  const leftColRef = useRef(null);

  /* ---- share / copy ---- */
  const currentUrl = useMemo(() => (typeof window !== "undefined" ? window.location.href : ""), []);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Copied!", { description: "Link copied to clipboard." });
    } catch {
      toast.error("Failed to copy link");
    }
  };
  const openShare = (where) => {
    const u = encodeURIComponent(currentUrl);
    const map = {
      fb: `https://www.facebook.com/share.php?u=${u}`,
      li: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      tw: `https://twitter.com/intent/tweet?url=${u}`,
    };
    const url = map[where];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ---- load post + category + author + likes + comments ---- */
  useEffect(() => {
    if (!Number.isFinite(pid)) {
      setErr("Invalid post id");
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchCommentsWithUsers(postId) {
      const { data: rows } = await supabase
        .from("comments")
        .select("id, post_id, user_id, comment_text, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!rows?.length) return [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: users } = await supabase
        .from("users")
        .select("id, username, name, profile_pic")
        .in("id", userIds);
      const map = new Map((users || []).map((u) => [u.id, u]));
      return rows.map((r) => ({ ...r, user: map.get(r.user_id) || null }));
    }

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // 1) โหลดโพสต์ (ต้องมี user_id อ้างถึงผู้เขียน)
        const { data: p, error: pErr } = await supabase
          .from("posts")
          .select("id,image,title,description,content,date,category_id,likes_count,status_id,user_id")
          .eq("id", pid)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!p) {
          setErr("Not found");
          return;
        }

        // 2) หมวดหมู่
        if (p.category_id != null) {
          const { data: cat } = await supabase
            .from("categories")
            .select("id,name")
            .eq("id", p.category_id)
            .maybeSingle();
          if (mounted) setCategory(cat || null);
        } else {
          if (mounted) setCategory(null);
        }

        // 3) ผู้เขียนจริง (จาก posts.user_id)
        if (p.user_id) {
          const { data: au } = await supabase
            .from("users")
            .select("id,username,name,profile_pic")
            .eq("id", p.user_id)
            .maybeSingle();
          if (mounted) setAuthor(au || null);
        } else {
          if (mounted) setAuthor(null);
        }

        // 4) นับไลก์
        const { count: likeCount } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", pid);

        // 5) เราไลก์เองไหม
        let iLike = false;
        if (user?.id) {
          const { data: mine } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", pid)
            .eq("user_id", user.id)
            .maybeSingle();
          iLike = Boolean(mine);
        }

        // 6) คอมเมนต์
        const hydratedComments = await fetchCommentsWithUsers(pid);

        if (!mounted) return;
        setPost({
          id: p.id,
          image: p.image,
          title: p.title,
          description: p.description,
          content: p.content,
          dateFormatted: fmtBangkokDate(p.date),
        });
        setLikes(likeCount ?? p.likes_count ?? 0);
        setLikedByMe(iLike);
        setComments(hydratedComments);
      } catch (e) {
        console.error(e);
        setErr("Cannot load this article.");
        toast.error("Cannot load this article");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [pid, user?.id]);

  /* ---- helpers/actions ---- */
  const syncLikesCount = async () => {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid);
    await supabase.from("posts").update({ likes_count: count ?? 0 }).eq("id", pid);
    return count ?? 0;
  };

  const requireLogin = () => setOpenLoginDialog(true);

  const toggleLike = async () => {
    if (!user) return requireLogin();
    try {
      if (!likedByMe) {
        await supabase.from("likes").insert({
          post_id: pid,
          user_id: user.id,
          liked_at: new Date().toISOString(),
        });
        setLikedByMe(true);
      } else {
        await supabase.from("likes").delete().eq("post_id", pid).eq("user_id", user.id);
        setLikedByMe(false);
      }
      const newCount = await syncLikesCount();
      setLikes(newCount);
    } catch {
      toast.error("Failed to update like");
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) return requireLogin();
    const text = newComment.trim();
    if (!text) return;

    try {
      setSending(true);
      await supabase.from("comments").insert({
        post_id: pid,
        user_id: user.id,
        comment_text: text,
        created_at: new Date().toISOString(),
      });
      setNewComment("");

      const { data: rows } = await supabase
        .from("comments")
        .select("id, post_id, user_id, comment_text, created_at")
        .eq("post_id", pid)
        .order("created_at", { ascending: true });

      if (rows?.length) {
        const ids = Array.from(new Set(rows.map((r) => r.user_id)));
        const { data: users } = await supabase
          .from("users")
          .select("id, username, name, profile_pic")
          .in("id", ids);
        const map = new Map((users || []).map((u) => [u.id, u]));
        setComments(rows.map((r) => ({ ...r, user: map.get(r.user_id) || null })));
      } else {
        setComments([]);
      }
    } catch {
      toast.error("Failed to send comment");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (!user || user.id !== commentUserId) return;
    try {
      await supabase.from("comments").delete().eq("id", commentId);
      setComments((arr) => arr.filter((c) => c.id !== commentId));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  /* ---- render ---- */
  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900" />
        <p className="text-stone-700">Loading…</p>
      </div>
    );
  }
  if (err || !post) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{err || "Not found"}</p>
      </div>
    );
  }

  const catName = category?.name || "Uncategorized";
  const authorName = author?.name || author?.username || "Unknown";
  const authorAvatar = author?.profile_pic || "";

  return (
    <article className="pb-20">
      <div className="mx-auto mt-[60px] max-w-[1200px] px-[24px] md:px-[60px]">
        {/* cover */}
        <figure className="overflow-hidden rounded-2xl border border-stone-200">
          <img
            src={post.image}
            alt={post.title}
            className="aspect-[1200/587] w-full object-cover"
            loading="lazy"
          />
        </figure>

        {/* grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:mt-4 md:grid-cols-[1fr_320px] md:items-start">
          {/* left */}
          <div ref={leftColRef}>
            <div className="mb-2 flex items-center gap-3">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: "#D1FAE5",
                  color: "#047857",
                  border: "1px solid #A7F3D0",
                }}
                title={catName}
              >
                {catName}
              </span>
              <time className="text-xs text-stone-500">{post.dateFormatted}</time>
            </div>

            <h1 className="text-[28px] md:text-[32px] font-extrabold leading-tight tracking-tight text-stone-900">
              {post.title}
            </h1>

            <p className="mt-3 text-[15px] leading-relaxed text-stone-700">{post.description}</p>

            <div className="prose prose-stone mt-6 max-w-none prose-h2:text-[20px] prose-h2:font-semibold">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* Like + Share */}
            <div className="h-12" />
            <section className="rounded-2xl border border-stone-200 bg-stone-50 p-3 md:p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={toggleLike}
                  className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-base cursor-pointer border ${
                    likedByMe
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 text-stone-800"
                  }`}
                  aria-pressed={likedByMe}
                >
                  <Smile className="h-5 w-5" />
                  {likes}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-stone-300 px-5 text-base cursor-pointer"
                  >
                    <Copy className="h-5 w-5" />
                    Copy link
                  </button>
                  <button
                    onClick={() => openShare("fb")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openShare("li")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openShare("tw")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to Twitter/X"
                  >
                    <Twitter className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Comments */}
            <section className="mt-12 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Comments</h2>

              <form
                className="relative rounded-2xl border border-stone-300 bg-white p-4"
                onSubmit={handleSubmitComment}
              >
                {!user && (
                  <button
                    type="button"
                    onClick={() => setOpenLoginDialog(true)}
                    aria-label="Login required"
                    className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                  />
                )}

                <div className="flex items-start gap-3">
                  <AvatarCircle
                    src={
                      user?.user_metadata?.profile_pic ||
                      user?.user_metadata?.avatar_url ||
                      user?.profile_pic
                    }
                    alt={user?.user_metadata?.username || user?.email || "me"}
                    size={40}
                    zoom={1.22}
                    focusX={50}
                    focusY={30}
                  />
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "What are your thoughts?" : "Log in to comment"}
                    className="h-28 flex-1 resize-none rounded-xl border border-stone-300 p-4 outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-60"
                    disabled={!user || sending}
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={!user || sending || !newComment.trim()}
                    className="rounded-full bg-stone-900 px-6 py-2 text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>

              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AvatarCircle
                          src={c.user?.profile_pic || ""}
                          alt={c.user?.name || c.user?.username || "User"}
                          size={40}
                          zoom={1.22}
                          focusX={50}
                          focusY={30}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            {/* ชื่อ: ใช้ name ก่อน ถ้าไม่มีค่อย fallback username */}
                            <span className="font-semibold">
                              {c.user?.name || c.user?.username || "User"}
                            </span>
                            {/* เวลา: AM/PM ตามโซนเอเชีย/กรุงเทพฯ */}
                            <span className="text-xs text-stone-500">
                              {fmtBangkokDateTime(c.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-stone-800">
                            {c.comment_text}
                          </p>
                        </div>
                      </div>

                      {user?.id === c.user_id && (
                        <button
                          onClick={() => handleDeleteComment(c.id, c.user_id)}
                          className="cursor-pointer text-stone-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {!comments.length && <li className="text-stone-500">No comments yet.</li>}
              </ul>
            </section>
          </div>

          {/* right: sticky author */}
          <div className="hidden md:block md:self-start">
            <StickyCard offset={120} trackRef={leftColRef}>
              <div className="w-[305px] rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <AvatarCircle
                    src={authorAvatar}
                    alt={authorName}
                    size={36}
                    zoom={1.2}
                    focusX={50}
                    focusY={40}
                  />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-stone-500">Author</p>
                    <p className="font-semibold text-stone-900">{authorName}</p>
                  </div>
                </div>
                {/* ข้อความ bio — ตามที่คุณขอให้คงไว้ */}
                <p className="text-[13px] leading-relaxed text-stone-700">
                  I am a pet enthusiast and freelance writer who specializes in animal behavior and
                  care. With a deep love for cats, I enjoy sharing insights on feline companionship
                  and wellness.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-stone-700">
                  When I’m not writing, I spend time volunteering at my local animal shelter,
                  helping cats find loving homes.
                </p>
              </div>
            </StickyCard>
          </div>
        </div>
      </div>

      {/* login modal */}
      <SimpleModal open={openLoginDialog} onClose={() => setOpenLoginDialog(false)}>
        <h2 className="text-3xl font-extrabold leading-tight">
          Create an account to<br />continue
        </h2>
        <div className="mt-8">
          <button
            onClick={() => {
              setOpenLoginDialog(false);
              navigate("/sign-up");
            }}
            className="inline-flex w-[220px] items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-base font-semibold text-white hover:bg-stone-800 cursor-pointer"
          >
            Create account
          </button>
        </div>
        <p className="mt-6 text-stone-500">
          Already have an account?{" "}
          <button
            className="font-semibold underline underline-offset-4 cursor-pointer"
            onClick={() => {
              setOpenLoginDialog(false);
              navigate("/login");
            }}
          >
            Log in
          </button>
        </p>
      </SimpleModal>
    </article>
  );
}