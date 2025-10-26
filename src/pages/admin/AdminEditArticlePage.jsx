import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "@/lib/db";
import { ImageIcon, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

const BUCKET = "post-images";

export default function AdminEditArticlePage() {
  // ----- Route & nav -----
  const params = useParams();
  const rawId =
    params.id ?? params.postId ?? params.articleId ?? params.pid ?? "";
  const pid = Number(rawId);
  const navigate = useNavigate();

  // ----- Lists / loading -----
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ----- Form state -----
  const [form, setForm] = useState({
    image: "",
    category_id: null,
    title: "",
    description: "",
    content: "",
    status_id: null,
  });

  // ----- Upload states -----
  const fileInputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ===== Load post -> lists -> set form =====
  useEffect(() => {
    if (!Number.isFinite(pid)) {
      setErr("Invalid article id");
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) post
        const { data: post, error: postErr } = await supabase
          .from("posts")
          .select("*")
          .eq("id", pid)
          .single();
        if (postErr) throw postErr;

        // 2) lists (categories + statuses)
        const [{ data: cats, error: cErr }, { data: sts, error: sErr }] =
          await Promise.all([
            supabase.from("categories").select("id,name").order("id"),
            supabase.from("statuses").select("id,status").order("id"),
          ]);
        if (cErr) throw cErr;
        if (sErr) throw sErr;

        if (!active) return;

        setCategories(cats ?? []);
        setStatuses(sts ?? []);
        setListsLoaded(true);

        // 3) set form
        setForm({
          image: (post?.image ?? "").trim(),
          category_id:
            post?.category_id == null ? null : Number(post.category_id),
          title: post?.title ?? "",
          description: post?.description ?? "",
          content: post?.content ?? "",
          status_id:
            post?.status_id == null ? null : Number(post.status_id),
        });
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Load article failed");
        toast.error(e?.message || "Load article failed");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [pid]);

  // ===== Ensure selected ids still exist in lists =====
  useEffect(() => {
    if (!listsLoaded) return;

    // category guard
    if (form.category_id != null) {
      const exists = categories.some(
        (c) => Number(c.id) === Number(form.category_id)
      );
      if (!exists) setForm((p) => ({ ...p, category_id: null }));
    }

    // status guard
    if (form.status_id != null) {
      const exists = statuses.some(
        (s) => Number(s.id) === Number(form.status_id)
      );
      if (!exists) setForm((p) => ({ ...p, status_id: null }));
    }
  }, [listsLoaded, categories, statuses, form.category_id, form.status_id]);

  // ===== Upload helpers =====
  const pickFile = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast.error("Please select an image file.");
      return;
    }
    setLocalFile(f);
    setLocalPreview(URL.createObjectURL(f));
  };

  const clearLocal = () => {
    setLocalFile(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
  };

  const uploadToStorage = async () => {
    if (!localFile) {
      toast.error("Please choose an image to upload.");
      return null;
    }
    try {
      setUploading(true);
      const ext = localFile.name.split(".").pop() || "jpg";
      const path = `posts/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, localFile, { upsert: false });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Cannot get public URL");

      setForm((s) => ({ ...s, image: publicUrl }));
      clearLocal();
      toast.success("Image uploaded");
      return publicUrl;
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ===== Save =====
  const save = async () => {
    if (!Number.isFinite(pid)) return;
    try {
      if (saving || uploading) return;
      setSaving(true);

      let imageUrl = form.image;
      if (localFile) {
        const uploadedUrl = await uploadToStorage();
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      if (form.category_id == null || form.status_id == null) {
        toast.error("Please select category and status.");
        setSaving(false);
        return;
      }

      const payload = {
        image: imageUrl,
        category_id: form.category_id,
        title: form.title,
        description: form.description, // intro ที่หน้าอ่านจะโชว์ใต้หัวข้อ
        content: form.content,
        status_id: form.status_id,
      };

      const { error } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", pid);
      if (error) throw error;

      toast.success("Saved successfully");
      navigate("/admin/article-management");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!Number.isFinite(pid)) return;
    if (!confirm("Delete this article?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", pid);
      if (error) throw error;
      toast.success("Deleted");
      navigate("/admin/article-management");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Delete failed");
    }
  };

  // DnD
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f && /^image\//.test(f.type)) {
      setLocalFile(f);
      setLocalPreview(URL.createObjectURL(f));
    }
  };
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ===== Render guards =====
  if (!Number.isFinite(pid)) {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 p-8">Invalid article id</main>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 p-8">Loading…</main>
      </div>
    );
  }
  if (err) {
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 p-8 text-red-600">{err}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Edit article #{pid}</h2>
          <div className="space-x-2">
            <Button
              className="px-8 py-2 rounded-full cursor-pointer"
              onClick={save}
              disabled={saving || uploading}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <form
          className="space-y-7 max-w-4xl"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Thumbnail */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Thumbnail
            </label>

            <div className="flex items-start gap-4">
              {/* Dropzone / Preview */}
              <div
                className="relative flex w-full max-w-lg h-64 border-2 border-dashed rounded-md bg-gray-50 text-center overflow-hidden"
                onDragEnter={prevent}
                onDragOver={prevent}
                onDrop={onDrop}
              >
                {!localPreview && !form.image && (
                  <div className="m-auto space-y-2 p-6">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-stone-500">
                      Drag & drop image here, or{" "}
                      <button
                        type="button"
                        className="underline text-stone-700 cursor-pointer"
                        onClick={pickFile}
                      >
                        browse
                      </button>
                    </p>
                  </div>
                )}

                {localPreview && (
                  <>
                    <img
                      src={localPreview}
                      alt="preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white cursor-pointer"
                      onClick={clearLocal}
                      title="Remove selected file"
                      aria-label="Remove selected file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}

                {!localPreview && form.image?.trim() && (
                  <img
                    src={form.image}
                    alt="thumbnail"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 max-w-lg w-full">
                <Input
                  placeholder="https://… (image URL)"
                  value={form.image}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, image: e.target.value }))
                  }
                />

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={pickFile}
                    disabled={uploading}
                    className="cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose file
                  </Button>

                  <Button
                    type="button"
                    onClick={uploadToStorage}
                    disabled={!localFile || uploading}
                    className="cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload to storage
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-stone-500">
                  รองรับ JPEG/PNG/GIF/WEBP ขนาดไฟล์ตามที่ตั้งไว้ใน Storage
                </p>
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-700 font-medium">
              Category
            </label>
            <Select
              key={`cat-${form.category_id}-${categories.length}`}
              defaultValue={
                form.category_id != null ? String(form.category_id) : undefined
              }
              onValueChange={(val) =>
                setForm((s) => ({ ...s, category_id: Number(val) }))
              }
              disabled={!listsLoaded}
            >
              <SelectTrigger className="max-w-lg mt-1 py-3 rounded-sm cursor-pointer">
                <SelectValue
                  placeholder={listsLoaded ? "Select category" : "Loading…"}
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={String(c.id)}
                    className="cursor-pointer"
                  >
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 font-medium">
              Status
            </label>
            <Select
              key={`st-${form.status_id}-${statuses.length}`}
              defaultValue={
                form.status_id != null ? String(form.status_id) : undefined
              }
              onValueChange={(val) =>
                setForm((s) => ({ ...s, status_id: Number(val) }))
              }
              disabled={!listsLoaded}
            >
              <SelectTrigger className="max-w-lg mt-1 py-3 rounded-sm cursor-pointer">
                <SelectValue
                  placeholder={listsLoaded ? "Select status" : "Loading…"}
                />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={String(s.id)}
                    className="cursor-pointer"
                  >
                    {s.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-gray-700 font-medium">
              Title
            </label>
            <Input
              placeholder="Article title"
              value={form.title}
              onChange={(e) =>
                setForm((s) => ({ ...s, title: e.target.value }))
              }
              className="mt-1 py-3 rounded-sm"
            />
          </div>

          {/* Introduction (max 240 letters) */}
          <div>
            <label className="block text-gray-700 font-medium">
              Introduction (max 240 letters)
            </label>
            <Textarea
              rows={5}
              maxLength={240} // 👈 เปลี่ยนเป็น 240
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              className="mt-1 py-3 rounded-sm"
            />
            <div className="text-[12px] text-stone-500 mt-1">
              This shows under the article title.
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-gray-700 font-medium">
              Content
            </label>
            <Textarea
              rows={20}
              value={form.content}
              onChange={(e) =>
                setForm((s) => ({ ...s, content: e.target.value }))
              }
              className="mt-1 py-3 rounded-sm"
            />
          </div>
        </form>

        <button
          onClick={remove}
          className="underline underline-offset-2 hover:text-muted-foreground text-sm font-medium flex items-center gap-1 mt-4 cursor-pointer"
        >
          <Trash2 className="h-5 w-5" />
          Delete article
        </button>
      </main>
    </div>
  );
}