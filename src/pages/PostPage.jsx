import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Copy, Facebook, Linkedin, Twitter, Laugh } from "lucide-react";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_BASE = "https://blog-post-project-api.vercel.app";

export default function PostPage() {
  const { postId } = useParams();

  // จำลองสถานะล็อกอิน (ใน assignment นี้ให้ถือว่า "ยังไม่ได้ล็อกอิน")
  const isLoggedIn = false;

  const [post, setPost] = useState(null);
  const [likes, setLikes] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openLoginDialog, setOpenLoginDialog] = useState(false);

  // format ISO date -> "11 September 2024"
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  useEffect(() => {
    const fetchById = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await axios.get(`${API_BASE}/posts/${postId}`);
        const data = res.data;
        setPost({
          ...data,
          date: formatDate(data.date),
        });
        setLikes(data.likes ?? 0);
      } catch (e) {
        console.error(e);
        setErr("Cannot load this article.");
      } finally {
        setLoading(false);
      }
    };
    fetchById();
  }, [postId]);

  const currentUrl = useMemo(() => window.location.href, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Copied!", {
        description: "This article link has been copied to your clipboard.",
      });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const openShare = (where) => {
    const u = encodeURIComponent(currentUrl);
    let target = "";
    if (where === "fb") target = `https://www.facebook.com/share.php?u=${u}`;
    if (where === "li")
      target = `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    if (where === "tw") target = `https://www.twitter.com/share?&url=${u}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const requireLogin = () => setOpenLoginDialog(true);

  const handleLike = () => {
    if (!isLoggedIn) return requireLogin();
    setLikes((v) => v + 1); // demo only
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!isLoggedIn) return requireLogin();
    if (!comment.trim()) return;
    toast.success("Comment sent (demo)");
    setComment("");
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-stone-900"></div>
        <p className="text-stone-700">Loading...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  if (!post) return null;

  return (
    <article className="space-y-8">
      {/* cover image */}
      <figure className="overflow-hidden rounded-2xl border border-stone-200">
        <img
          src={post.image}
          alt={post.title}
          className="w-full object-cover"
          loading="lazy"
        />
      </figure>

      {/* header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-green-200 px-3 py-1 font-semibold text-green-700">
            {post.category}
          </span>
          <span className="text-stone-500">{post.date}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          {post.title}
        </h1>
        <p className="text-stone-600">{post.description}</p>
      </header>

      {/* body markdown */}
      <div className="markdown">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      {/* actions row */}
      <section className="rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleLike}
            className="inline-flex items-center gap-2 rounded-full border border-stone-400 px-6 py-3 text-lg"
          >
            <Laugh className="h-5 w-5" />
            {likes}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full border border-stone-400 px-6 py-3 text-lg"
            >
              <Copy className="h-5 w-5" /> Copy
            </button>

            <button
              onClick={() => openShare("fb")}
              className="grid h-12 w-12 place-items-center rounded-full border border-stone-400"
              aria-label="Share to Facebook"
            >
              <Facebook className="h-5 w-5" />
            </button>
            <button
              onClick={() => openShare("li")}
              className="grid h-12 w-12 place-items-center rounded-full border border-stone-400"
              aria-label="Share to LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </button>
            <button
              onClick={() => openShare("tw")}
              className="grid h-12 w-12 place-items-center rounded-full border border-stone-400"
              aria-label="Share to Twitter/X"
            >
              <Twitter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* comment box */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Comment</h2>
        <form
          onSubmit={handleSubmitComment}
          className="rounded-2xl border border-stone-300 p-4"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What are your thoughts?"
            className="h-36 w-full resize-none rounded-xl border border-stone-300 p-4 outline-none focus:ring-2 focus:ring-stone-300"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-6 py-2 text-white hover:bg-stone-800"
            >
              Send
            </button>
          </div>
        </form>
      </section>

      {/* Alert Dialog: require login */}
      <AlertDialog open={openLoginDialog} onOpenChange={setOpenLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create an account to continue</AlertDialogTitle>
            <AlertDialogDescription>
              You need to log in to like and comment on this post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenLoginDialog(false)}>
              Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpenLoginDialog(false);
                toast.info("Login flow not implemented in this assignment.");
              }}
            >
              Create account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}