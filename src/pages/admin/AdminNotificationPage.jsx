import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/db";
import { AdminSidebar } from "@/components/AdminWebSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/contexts/authentication";

/* ================= Config ================= */
const DEFAULT_AVATAR = "/avatar-default.svg";

/* ================= Time helpers (Asia/Bangkok, AM/PM) ================= */

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
    // fallback manual (+7h)
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

/* ================= SafeAvatar ================= */
function SafeAvatar({ src, alt, initials, className }) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_AVATAR);

  useEffect(() => {
    setImgSrc(src || DEFAULT_AVATAR);
  }, [src]);

  return (
    <Avatar className={className}>
      <AvatarImage
        src={imgSrc}
        alt={alt || "user avatar"}
        onError={() => setImgSrc(DEFAULT_AVATAR)}
      />
      <AvatarFallback>{(initials || "U").toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/* ================= Page ================= */
export default function AdminNotificationPage() {
  const { state } = useAuth();
  const myId = state?.user?.id || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        // 1) ดึง comments
        let { data: cmt, error: cErr } = await supabase
          .from("comments")
          .select("id, post_id, user_id, comment_text, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (cErr) throw cErr;

        // 2) ดึง likes
        let { data: lk, error: lErr } = await supabase
          .from("likes")
          .select("id, post_id, user_id, liked_at")
          .order("liked_at", { ascending: false })
          .limit(50);
        if (lErr) throw lErr;

        // กรอง “การกระทำของตัวเอง” ออก
        if (myId) {
          cmt = (cmt || []).filter((r) => r.user_id !== myId);
          lk = (lk || []).filter((r) => r.user_id !== myId);
        }

        // 3) collect ids
        const userIds = Array.from(
          new Set(
            [
              ...(cmt ?? []).map((r) => r.user_id),
              ...(lk ?? []).map((r) => r.user_id),
            ].filter(Boolean)
          )
        );
        const postIds = Array.from(
          new Set(
            [
              ...(cmt ?? []).map((r) => r.post_id),
              ...(lk ?? []).map((r) => r.post_id),
            ].filter(Boolean)
          )
        );

        // 4) users (name, username, profile_pic)
        const userMap = new Map();
        if (userIds.length) {
          const { data: users, error: uErr } = await supabase
            .from("users")
            .select("id, name, username, profile_pic")
            .in("id", userIds);
          if (uErr) throw uErr;
          users?.forEach((u) => userMap.set(u.id, u));
        }

        // 5) posts
        const postMap = new Map();
        if (postIds.length) {
          const { data: posts, error: pErr } = await supabase
            .from("posts")
            .select("id, title")
            .in("id", postIds);
          if (pErr) throw pErr;
          posts?.forEach((p) => postMap.set(p.id, p));
        }

        // 6) hydrate
        const commentRows = (cmt ?? []).map((r) => {
          const u = userMap.get(r.user_id);
          const p = postMap.get(r.post_id);
          return {
            id: `c_${r.id}`,
            type: "comment",
            created_at: r.created_at,
            articleId: p?.id,
            articleTitle: p?.title ?? "—",
            content: r.comment_text ?? "",
            userName: u?.name || u?.username || "Unknown",
            userAvatar: u?.profile_pic || DEFAULT_AVATAR,
          };
        });

        const likeRows = (lk ?? []).map((r) => {
          const u = userMap.get(r.user_id);
          const p = postMap.get(r.post_id);
          return {
            id: `l_${r.id}`,
            type: "like",
            created_at: r.liked_at,
            articleId: p?.id,
            articleTitle: p?.title ?? "—",
            content: "",
            userName: u?.name || u?.username || "Unknown",
            userAvatar: u?.profile_pic || DEFAULT_AVATAR,
          };
        });

        const merged = [...commentRows, ...likeRows].sort(
          (a, b) =>
            (toDateFromSupabase(b.created_at)?.getTime() ?? 0) -
            (toDateFromSupabase(a.created_at)?.getTime() ?? 0)
        );

        if (!active) return;
        setItems(merged);
      } catch (e) {
        console.error("[notifications] load error:", e);
        if (!active) return;
        toast.error("Failed to load notifications", {
          description:
            e?.message || "Please check table policies (RLS) and relationships.",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [myId]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      {/* scrollable content area */}
      <main className="flex-1 p-8 bg-gray-50 h-screen overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6">Notification</h2>

        {loading ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : (
          <div className="space-y-4 pb-8">
            {items.map((n) => (
              <div key={n.id}>
                <div className="p-4 rounded-lg flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <SafeAvatar
                      className="w-10 h-10"
                      src={n.userAvatar}
                      alt={n.userName}
                      initials={n.userName?.[0] || "U"}
                    />
                    <div>
                      <h3 className="text-sm font-bold inline">{n.userName}</h3>{" "}
                      <p className="text-sm font-normal inline">
                        {n.type === "comment" ? "commented on" : "liked"} your
                        article: {n.articleTitle}
                      </p>
                      {n.type === "comment" && n.content && (
                        <p className="mt-1 text-sm text-black">{n.content}</p>
                      )}
                      <p className="mt-1 text-xs text-orange-600">
                        {fmtBangkokDateTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                  {n.articleId ? (
                    <Link
                      to={`/post/${n.articleId}`}
                      className="underline underline-offset-2 hover:text-muted-foreground text-sm font-medium"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-sm text-stone-400">—</span>
                  )}
                </div>
                <hr className="border-t border-gray-200 my-4" />
              </div>
            ))}
            {!loading && items.length === 0 && (
              <p className="text-sm text-stone-500">No notifications.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}