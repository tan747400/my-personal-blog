import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/db";
import { AdminSidebar } from "@/components/AdminWebSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AdminNotificationPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลด notifications จาก 2 ตาราง แล้วรวม/เรียงเวลา
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        // 1) comments: join ผู้ใช้และโพสต์ (ชื่อ/รูป/หัวข้อ)
        const { data: cmt, error: cErr } = await supabase
          .from("comments")
          .select(
            `
            id,
            post_id,
            user_id,
            comment_text,
            created_at,
            users:users!comments_user_id_fkey ( username, profile_pic ),
            posts:posts!comments_post_id_fkey ( id, title )
          `
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (cErr) throw cErr;

        const commentRows =
          (cmt ?? []).map((r) => ({
            id: `c_${r.id}`,
            type: "comment",
            created_at: r.created_at,
            articleId: r.posts?.id,
            articleTitle: r.posts?.title ?? "—",
            content: r.comment_text ?? "",
            userName: r.users?.username ?? "Unknown",
            userAvatar: r.users?.profile_pic ?? "",
          })) ?? [];

        // 2) likes: join ผู้ใช้และโพสต์
        const { data: lk, error: lErr } = await supabase
          .from("likes")
          .select(
            `
            id,
            post_id,
            user_id,
            liked_at,
            users:users!likes_user_id_fkey ( username, profile_pic ),
            posts:posts!likes_post_id_fkey ( id, title )
          `
          )
          .order("liked_at", { ascending: false })
          .limit(50);

        if (lErr) throw lErr;

        const likeRows =
          (lk ?? []).map((r) => ({
            id: `l_${r.id}`,
            type: "like",
            created_at: r.liked_at,
            articleId: r.posts?.id,
            articleTitle: r.posts?.title ?? "—",
            content: "",
            userName: r.users?.username ?? "Unknown",
            userAvatar: r.users?.profile_pic ?? "",
          })) ?? [];

        // รวม + เรียงเวลาใหม่
        const merged = [...commentRows, ...likeRows].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        if (!active) return;
        setItems(merged);
      } catch (e) {
        console.error(e);
        if (!active) return;
        toast.error("Failed to load notifications");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />

      <main className="flex-1 p-8 bg-gray-50 overflow-hidden">
        <h2 className="text-2xl font-semibold mb-6">Notification</h2>

        {loading ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : (
          <div className="space-y-4">
            {items.map((n) => (
              <div key={n.id}>
                <div className="p-4 rounded-lg flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={n.userAvatar} alt={n.userName} />
                      <AvatarFallback>
                        {n.userName?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-bold inline">{n.userName}</h3>
                      <p className="text-sm font-normal inline">
                        {n.type === "comment" ? " commented on " : " liked "}
                        your article: {n.articleTitle}
                      </p>
                      {n.type === "comment" && n.content && (
                        <p className="mt-1 text-sm text-gray-500">{n.content}</p>
                      )}
                      <p className="mt-1 text-xs text-orange-400">
                        {formatDateTime(n.created_at)}
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