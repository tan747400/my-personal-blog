import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/db";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { ImageIcon, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminSidebar } from "@/components/AdminWebSection";
import { toast } from "sonner";

const BUCKET = "post-images";

export default function AdminCreateArticlePage() {
  const navigate = useNavigate();

  // lists
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // author (ต้องมี id)
  const [author, setAuthor] = useState({ id: "", name: "", pic: "" });

  // form
  const [form, setForm] = useState({
    image: "", category_id: "", title: "", description: "", content: "",
  });

  // uploads
  const fileInputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // load lists + current author
  useEffect(() => {
    (async () => {
      try {
        const [{ data: cats, error: cErr }, { data: sts, error: sErr }] =
          await Promise.all([
            supabase.from("categories").select("id,name").order("id"),
            supabase.from("statuses").select("id,status").order("id"),
          ]);
        if (cErr) throw cErr;
        if (sErr) throw sErr;
        setCategories(cats ?? []);
        setStatuses(sts ?? []);

        // ดึงโปรไฟล์ที่ล็อกอิน (และ ensure ใน users)
        const me = await getCurrentProfile();
        if (!me?.id) {
          toast.error("ไม่สามารถระบุผู้ใช้ที่ล็อกอินได้");
          return;
        }
        setAuthor({
          id: me.id,
          name: me.name || me.username || "",
          pic: me.profile_pic || "",
        });
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Load lists failed");
      }
    })();
  }, []);

  const onChange = (k) => (e) =>
    setForm((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

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
      const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, localFile, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data?.publicUrl;
      if (!url) throw new Error("Cannot get public URL");
      setForm((s) => ({ ...s, image: url }));
      clearLocal();
      toast.success("Image uploaded");
      return url;
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish = false) => {
    try {
      if (saving || uploading) return;

      if (!form.title || !form.category_id) {
        toast.error("Please fill required fields (title, category).");
        return;
      }
      if (!author.id) {
        toast.error("Cannot determine current user.");
        return;
      }

      setSaving(true);

      // ensure image
      let imageUrl = form.image;
      if (!imageUrl && localFile) {
        const url = await uploadToStorage();
        if (!url) { setSaving(false); return; }
        imageUrl = url;
      }
      if (!imageUrl) {
        setSaving(false);
        toast.error("Please add a thumbnail image.");
        return;
      }

      // resolve status id
      const draftId   = statuses.find((s) => s.status?.toLowerCase() === "draft")?.id;
      const publishId = statuses.find((s) => s.status?.toLowerCase() === "publish")?.id;
      const statusIdToUse = publish ? publishId : draftId;
      if (!statusIdToUse) {
        setSaving(false);
        toast.error("No status found. Please seed 'draft'/'publish'.");
        return;
      }

      // insert (สำคัญ: user_id)
      const payload = {
        image: imageUrl,
        category_id: Number(form.category_id),
        title: form.title,
        description: form.description,
        content: form.content,
        status_id: Number(statusIdToUse),
        date: new Date().toISOString(),
        likes_count: 0,
        user_id: author.id,           // <<<<<< ใส่ user_id
      };

      const { error } = await supabase.from("posts").insert(payload);
      if (error) throw error;

      toast.success(publish ? "Published" : "Saved as draft");
      navigate("/admin/article-management");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // DnD
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f && /^image\//.test(f.type)) {
      setLocalFile(f);
      setLocalPreview(URL.createObjectURL(f));
    }
  };
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Create article</h2>
          <div className="space-x-2">
            <Button className="px-8 py-2 rounded-full cursor-pointer"
              variant="outline" disabled={saving || uploading}
              onClick={() => save(false)}>
              {saving ? "Saving…" : "Save as draft"}
            </Button>
            <Button className="px-8 py-2 rounded-full cursor-pointer"
              disabled={saving || uploading} onClick={() => save(true)}>
              {saving ? "Publishing…" : "Save and publish"}
            </Button>
          </div>
        </div>

        <form className="space-y-7 max-w-4xl" onSubmit={(e) => e.preventDefault()}>
          {/* Thumbnail */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">Thumbnail</label>
            <div className="flex items-start gap-4">
              {/* Dropzone */}
              <div
                className="relative flex w-full max-w-lg h-64 border-2 border-dashed rounded-md bg-gray-50 text-center overflow-hidden"
                onDragEnter={prevent} onDragOver={prevent} onDrop={onDrop}
              >
                {!localPreview && !form.image && (
                  <div className="m-auto space-y-2 p-6">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-stone-500">
                      Drag & drop image here, or{" "}
                      <button type="button" className="underline text-stone-700 cursor-pointer" onClick={pickFile}>
                        browse
                      </button>
                    </p>
                  </div>
                )}
                {localPreview && (
                  <>
                    <img src={localPreview} alt="preview" className="absolute inset-0 h-full w-full object-cover" />
                    <button type="button"
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white cursor-pointer"
                      onClick={clearLocal} title="Remove selected file" aria-label="Remove selected file">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {!localPreview && form.image && (
                  <img src={form.image} alt="thumbnail" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 max-w-lg w-full">
                <Input placeholder="https://… (image URL)"
                  value={form.image}
                  onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))} />
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  <Button type="button" variant="outline" onClick={pickFile}
                    disabled={uploading} className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose file
                  </Button>
                  <Button type="button" onClick={uploadToStorage}
                    disabled={!localFile || uploading} className="cursor-pointer">
                    {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>)
                              : (<><Upload className="h-4 w-4 mr-2" />Upload to storage</>)}
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
            <label>Category</label>
            <Select value={String(form.category_id || "")}
              onValueChange={(val) => setForm((s) => ({ ...s, category_id: val }))}>
              <SelectTrigger className="max-w-lg mt-1 py-3 rounded-sm cursor-pointer">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(categories || []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author name (read-only) */}
          <div>
            <label>Author name</label>
            <Input value={author.name || ""} readOnly disabled
              className="mt-1 py-3 rounded-sm bg-stone-100/70 text-stone-500"
              placeholder="No author" />
          </div>

          {/* Title */}
          <div>
            <label>Title</label>
            <Input placeholder="Article title" value={form.title}
              onChange={onChange("title")} className="mt-1 py-3 rounded-sm" />
          </div>

          {/* Intro */}
          <div>
            <label>Introduction (max 120 letters)</label>
            <Textarea placeholder="Introduction" rows={3} maxLength={120}
              value={form.description} onChange={onChange("description")}
              className="mt-1 py-3 rounded-sm" />
          </div>

          {/* Content */}
          <div>
            <label>Content</label>
            <Textarea placeholder="Content" rows={20}
              value={form.content} onChange={onChange("content")}
              className="mt-1 py-3 rounded-sm" />
          </div>
        </form>
      </main>
    </div>
  );
}