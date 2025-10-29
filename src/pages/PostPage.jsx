import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Copy,
  Facebook,
  Linkedin,
  Twitter,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

import supabase from "@/lib/db";
import { useAuth } from "@/contexts/authentication";
import AvatarCircle from "@/components/AvatarCircle";

/* ================= StickyCard ================= */
function StickyCard({ offset = 120, trackRef, children }) {
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const [style, setStyle] = useState({
    position: "relative",
    top: 0,
    width: "auto",
  });

  useEffect(() => {
    const onUpdate = () => {
      const wrap = wrapRef.current;
      const card = cardRef.current;
      if (!wrap || !card) return;

      const leftEl = trackRef?.current || null;
      const leftH = leftEl
        ? leftEl.scrollHeight || leftEl.offsetHeight || 0
        : 0;
      const cardH = card.offsetHeight;
      const minH = Math.max(leftH, cardH);
      if (wrap.style.minHeight !== `${minH}px`) {
        wrap.style.minHeight = `${minH}px`;
      }

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
        setStyle({
          position: "fixed",
          top: `${offset}px`,
          width: `${rect.width}px`,
        });
        return;
      }

      const bottomY = minH - cardH;
      setStyle({
        position: "absolute",
        top: `${bottomY}px`,
        width: "100%",
      });
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
      <div ref={cardRef} style={style}>
        {children}
      </div>
    </div>
  );
}

/* ================= Helpers ================= */

// parse timestamp (handle string without TZ as UTC)
function toDateFromSupabase(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  if (!hasTZ && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return new Date(s + "Z");
  }
  return new Date(s);
}

// 23 October 2025 (Asia/Bangkok)
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
    return bkk.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
}

// Oct 21, 2025, 02:13 PM (Asia/Bangkok)
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
      hour12: true,
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

/* normalizeAdminContent */
function normalizeAdminContent(raw = "") {
  if (!raw) return "";
  let out = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // "##หัวข้อ" -> "## หัวข้อ"
  out = out.replace(/^(#{1,6})([^\s#])/gm, (_, hashes, rest) => {
    return `${hashes} ${rest}`;
  });
  return out;
}

/* ManualContentRenderer */
function ManualContentRenderer({ text }) {
  if (!text) return null;
  const prepared = normalizeAdminContent(text);
  const rawLines = prepared.split("\n");

  return (
    <div>
      {rawLines.map((origLine, idx) => {
        const lineNoNbsp = origLine.replace(/\u00A0/g, " ");
        const lineHeadTrimmed = lineNoNbsp.replace(/^[ \t]+/, "");
        const lineFullyTrimmed = lineHeadTrimmed.trim();

        if (lineFullyTrimmed === "") {
          return <div key={idx} className="mb-3" />;
        }

        const headingMatch = lineHeadTrimmed.match(/^(#{1,3})\s*(.+)$/);
        if (headingMatch) {
          const hashes = headingMatch[1];
          const content = headingMatch[2].trim();
          if (content !== "") {
            if (hashes.length === 1) {
              return (
                <h1
                  key={idx}
                  className="mt-6 mb-2 text-[24px] font-extrabold font-sans text-[#26231E] leading-snug tracking-tight"
                >
                  {content}
                </h1>
              );
            }
            if (hashes.length === 2) {
              return (
                <h2
                  key={idx}
                  className="mt-6 mb-2 text-[20px] font-bold font-sans text-[#26231E] leading-snug tracking-tight"
                >
                  {content}
                </h2>
              );
            }
            if (hashes.length === 3) {
              return (
                <h3
                  key={idx}
                  className="mt-6 mb-2 text-[18px] font-semibold font-sans text-[#26231E] leading-snug tracking-tight"
                >
                  {content}
                </h3>
              );
            }
          }
        }

        const bulletMatch = lineHeadTrimmed.match(/^[-*]\s*(.+)$/);
        if (bulletMatch) {
          const bulletText = bulletMatch[1] || "";
          return (
            <div key={idx} className="mb-2 flex items-start gap-2">
              <div className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-[#26231E]" />
              <p className="whitespace-pre-wrap text-[16px] leading-relaxed font-sans text-[#26231E]">
                {bulletText}
              </p>
            </div>
          );
        }

        return (
          <p
            key={idx}
            className="mb-3 whitespace-pre-wrap text-[16px] font-sans leading-relaxed text-[#26231E]"
          >
            {origLine}
          </p>
        );
      })}
    </div>
  );
}

/* ================= AuthorCard ================= */
/*
  - ใช้ทั้ง mobile และ desktop
  - layout ตาม Figma: กล่อง bg off-white, border, radius ใหญ่
  - บรรทัดบน: avatar + (Author label + name)
  - เส้นคั่น
  - bio paragraph(s)
*/
function AuthorCard({ avatar, name, bio }) {
  if (!name && !bio) return null;

  return (
    <section className="rounded-xl bg-[#EFEEEB] p-4 md:p-5 text-[#75716B] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      {/* Row: avatar + texts */}
      <div className="flex items-start gap-3">
        <AvatarCircle
          src={avatar}
          alt={name || "Author"}
          size={44}
          zoom={1.2}
          focusX={50}
          focusY={40}
        />

        <div className="flex-1">
          <p className="text-[12px] leading-[1.2] font-sans text-[#75716B]">Author</p>
          <p className="text-[20px] font-sans font-semibold leading-7 text-[#43403B]">
            {name}
          </p>
        </div>
      </div>

      {/* divider line */}
      <div className="my-4 h-px w-full bg-stone-300" />

      {/* bio text */}
      {bio && (
        <p className="whitespace-pre-line text-[16px] font-sans font-medium text-base leading-relaxed text-[#75716B]">
          {bio}
        </p>
      )}
    </section>
  );
}

/* ================= SimpleModal ================= */
function SimpleModal({ open, onClose, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
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

/* ================= Page ================= */
export default function PostPage() {
  const { postId } = useParams();
  const pid = Number(postId);

  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [category, setCategory] = useState(null);

  const [author, setAuthor] = useState({
    id: null,
    name: "",
    username: "",
    profile_pic: "",
    bio: "",
  });

  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const [openLoginDialog, setOpenLoginDialog] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // sticky ref
  const leftColRef = useRef(null);

  // URL ปัจจุบัน (ไว้แชร์)
  const currentUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );

  // copy link
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Copied!", {
        description: "Link copied to clipboard.",
      });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // share window helper
  const shareTo = (where) => {
    const u = encodeURIComponent(currentUrl);
    const map = {
      fb: `https://www.facebook.com/share.php?u=${u}`,
      li: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      tw: `https://twitter.com/intent/tweet?url=${u}`,
    };
    const url = map[where];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // ===== helper: โหลดคอมเมนต์ + user =====
  async function fetchCommentsWithUsers(postId) {
    const { data: rows } = await supabase
      .from("comments")
      .select("id, post_id, user_id, comment_text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!rows?.length) return [];

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: usersRows } = await supabase
      .from("users")
      .select("id, username, name, profile_pic")
      .in("id", userIds);

    const map = new Map((usersRows || []).map((u) => [u.id, u]));
    return rows.map((r) => ({ ...r, user: map.get(r.user_id) || null }));
  }

  // ===== โหลดข้อมูลหลัก =====
  useEffect(() => {
    if (!Number.isFinite(pid)) {
      setErr("Invalid post id");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) post
        const { data: p, error: pErr } = await supabase
          .from("posts")
          .select(
            "id,image,title,description,content,date,category_id,likes_count,status_id,user_id"
          )
          .eq("id", pid)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) {
          setErr("Not found");
          return;
        }

        // 2) category
        if (p.category_id != null) {
          const { data: cat } = await supabase
            .from("categories")
            .select("id,name")
            .eq("id", p.category_id)
            .maybeSingle();
          if (active) setCategory(cat || null);
        } else {
          if (active) setCategory(null);
        }

        // 3) author
        let foundAuthor = {
          id: null,
          name: "",
          username: "",
          profile_pic: "",
          bio: "",
        };

        if (p.user_id) {
          const { data: au, error: auErr } = await supabase
            .from("users")
            .select("id, username, name, profile_pic, bio")
            .eq("id", p.user_id)
            .maybeSingle();

          if (auErr) {
            console.warn("fetch author error:", auErr.message);
          }

          if (au) {
            foundAuthor = {
              id: au.id || null,
              name: au.name || "",
              username: au.username || "",
              profile_pic: au.profile_pic || "",
              bio: au.bio || "",
            };
          }
        }

        if (active) {
          setAuthor(foundAuthor);
        }

        // 4) like count
        const { count: likeCount } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", pid);

        // 5) did I like?
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

        // 6) comments
        const hydratedComments = await fetchCommentsWithUsers(pid);

        if (!active) return;

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
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [pid, user?.id]);

  // ===== like helpers =====
  const requireLogin = () => setOpenLoginDialog(true);

  const syncLikesCount = async () => {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid);

    await supabase
      .from("posts")
      .update({ likes_count: count ?? 0 })
      .eq("id", pid);

    return count ?? 0;
  };

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
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", pid)
          .eq("user_id", user.id);
        setLikedByMe(false);
      }

      const newCount = await syncLikesCount();
      setLikes(newCount);
    } catch {
      toast.error("Failed to update like");
    }
  };

  // ===== comment actions =====
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

      const fresh = await fetchCommentsWithUsers(pid);
      setComments(fresh);
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

  // ----- loading / error UI -----
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

  // ----- final render data -----
  const catName = category?.name || "Uncategorized";

  const authorName = author.name || author.username || "Unknown";
  const authorAvatar = author.profile_pic || "";
  const authorBio = (author.bio || "").trim();

  return (
    <article className="pb-20">
      <div className="mx-auto mt-[60px] max-w-[1200px] px-[24px] md:px-[60px]">
        {/* hero image */}
        <figure className="overflow-hidden rounded-2xl border border-stone-200">
          <img
            src={post.image}
            alt={post.title}
            className="aspect-[1200/587] w-full object-cover"
            loading="lazy"
          />
        </figure>

        {/* layout */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-12 md:grid-cols-[1fr_320px] md:items-start">
          {/* LEFT CONTENT */}
          <div ref={leftColRef}>
            {/* category + date */}
            <div className="mb-2 flex items-center gap-3">
              <span
                className="inline-flex rounded-full px-[12px] py-[4px] text-[14px] font-sans font-semibold"
                style={{
                  backgroundColor: "#D7F2E9",
                  color: "#12B279",
                }}
                title={catName}
              >
                {catName}
              </span>
              <time className="text-[16px] font-sans font-medium text-base leading-6 not-italic text-[#75716B] ">
                {post.dateFormatted}
              </time>
            </div>

            {/* title */}
            <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight font-sans text-[#26231E]">
              {post.title}
            </h1>

            {/* description */}
            <p className="mt-3 text-[16px] leading-relaxed text-[#26231E] font-sans">
              {post.description}
            </p>

            {/* content */}
            <div className="mt-6">
              <ManualContentRenderer text={post.content} />
            </div>

            {/* MOBILE AUTHOR CARD (visible < md) */}
            <div className="mt-8 md:hidden">
              <AuthorCard
                avatar={authorAvatar}
                name={authorName}
                bio={authorBio}
              />
            </div>

            {/* like + share */}
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
                    onClick={() => shareTo("fb")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => shareTo("li")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => shareTo("tw")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 cursor-pointer"
                    aria-label="Share to Twitter/X"
                  >
                    <Twitter className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* comments */}
            <section className="mt-12 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Comments</h2>

              {/* new comment box */}
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
                    placeholder={
                      user ? "What are your thoughts?" : "Log in to comment"
                    }
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

              {/* comment list */}
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-stone-200 bg-white p-3"
                  >
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span className="font-semibold">
                              {c.user?.name || c.user?.username || "User"}
                            </span>
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

                {!comments.length && (
                  <li className="text-stone-500">No comments yet.</li>
                )}
              </ul>
            </section>
          </div>

          {/* RIGHT COLUMN (desktop only) */}
          <div className="hidden md:block md:self-start">
            <StickyCard offset={120} trackRef={leftColRef}>
              <div className="w-[305px]">
                <AuthorCard
                  avatar={authorAvatar}
                  name={authorName}
                  bio={authorBio}
                />
              </div>
            </StickyCard>
          </div>
        </div>
      </div>

      {/* Modal login/signup */}
      <SimpleModal
        open={openLoginDialog}
        onClose={() => setOpenLoginDialog(false)}
      >
        <h2 className="text-3xl font-extrabold leading-tight">
          Create an account to
          <br />
          continue
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