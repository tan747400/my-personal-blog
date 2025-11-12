import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authentication";
import { toast } from "sonner";
import supabase from "@/lib/db";
import CircleAvatar from "@/components/CircleAvatar";

/* ================== constants/helpers ================== */
const BUCKET = "avatars";
const DEFAULT_AVATAR = "/avatar-default.svg";

// bust cache on normal http(s) images, but don't touch blob:/data:
function bust(url) {
  const safeUrl = url || DEFAULT_AVATAR;
  if (safeUrl.startsWith("blob:") || safeUrl.startsWith("data:")) return safeUrl;
  try {
    const u = new URL(safeUrl, window.location.origin);
    u.searchParams.set("v", Date.now().toString());
    return u.toString();
  } catch {
    return `${safeUrl}${safeUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
  }
}

// convert public URL -> storage path for deletion
function pathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const needle = `/object/public/${BUCKET}/`;
    const i = u.pathname.indexOf(needle);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + needle.length)) || null;
  } catch {
    const m = url.match(new RegExp(`/object/public/${BUCKET}/(.+)$`));
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}

// upload to storage, return public URL
async function uploadAvatarToStorage(file, userId) {
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const filePath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

/* ================== component ================== */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { state, fetchUser } = useAuth();
  const authUser = state.user;

  // เก็บ blob URL เดิมไว้ล้าง
  const lastBlobUrlRef = useRef(null);

  // 1) ค่าที่ “บันทึกจริง” และใช้แสดงในหัวข้อ/รูปด้านบน
  const [profile, setProfile] = useState({
    image: DEFAULT_AVATAR,
    name: "",
    username: "",
    email: "",
  });

  // 2) ค่าในฟอร์ม (ยังไม่เซฟ)
  const [form, setForm] = useState({ name: "", username: "" });

  // 3) รูปตัวอย่างรอเซฟ + ธงลบรูป
  const [previewImage, setPreviewImage] = useState(null); // string | null (blob: หรือ DEFAULT_AVATAR)
  const [pendingRemove, setPendingRemove] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const headerImage = useMemo(() => bust(profile.image), [profile.image]);                 // ใช้ในหัวข้อ (ของจริง)
  const editImage   = useMemo(() => bust(previewImage ?? profile.image), [previewImage, profile.image]); // ใช้ในพื้นที่แก้ไข

  /* -------- load once -------- */
  useEffect(() => {
    let alive = true;
    if (!authUser || initialized) return;

    (async () => {
      try {
        setLoading(true);
        const userId = authUser.id;
        const email = authUser.email || "";

        const { data: row, error: rowErr } = await supabase
          .from("users")
          .select("username,name,profile_pic")
          .eq("id", userId)
          .single();

        if (rowErr) console.warn("users row load warning:", rowErr.message);
        if (!alive) return;

        const imageFromDb =
          row?.profile_pic ||
          authUser.user_metadata?.profile_pic ||
          authUser.user_metadata?.avatar_url ||
          DEFAULT_AVATAR;

        const nameFromDb = row?.name || authUser.user_metadata?.name || "";
        const usernameFromDb = row?.username || authUser.user_metadata?.username || "";

        setProfile({ image: imageFromDb, name: nameFromDb, username: usernameFromDb, email });
        setForm({ name: nameFromDb, username: usernameFromDb });

        setInitialized(true);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (alive) {
          toast.error("Failed to load profile");
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
    };
  }, [authUser, initialized]);

  /* -------- input handlers -------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target; // "name" | "username"
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // เลือกรูป: แสดงตัวอย่างเฉพาะในฟอร์ม (หัวข้อยังเป็นรูปเดิม)
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type", { description: "Use JPEG/PNG/GIF/WebP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 5MB." });
      return;
    }

    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }
    const blobUrl = URL.createObjectURL(file);
    lastBlobUrlRef.current = blobUrl;

    setPreviewImage(blobUrl); // ✅ แสดงเฉพาะในส่วนแก้ไข
    setPendingRemove(false);  // ถ้าเคยกดลบ ให้ยกเลิกสถานะลบ
  };

  // กดลบรูป: ให้แสดง default ใน “ส่วนแก้ไข” แต่หัวข้อยังไม่เปลี่ยนจนกว่าจะ Save
  const handleMarkRemoveAvatar = () => {
    // เคลียร์ preview blob ถ้ามี
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }
    setPreviewImage(DEFAULT_AVATAR); // ให้เห็นว่าจะลบ
    setPendingRemove(true);
  };

  // Save: อัปโหลด/ลบ + บันทึกชื่อ/ผู้ใช้ แล้วค่อยอัปเดต “ของจริง”
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) return toast.error("Not signed in.");

    try {
      setIsSaving(true);
      const userId = authUser.id;
      let newAvatarUrl = profile.image; // เริ่มต้นจากรูปเดิม

      const isCurrentStored =
        !!profile.image &&
        !profile.image.startsWith("blob:") &&
        !profile.image.startsWith("data:") &&
        profile.image !== DEFAULT_AVATAR;

      // 1) จัดการรูปภาพก่อน
      if (pendingRemove && previewImage === DEFAULT_AVATAR) {
        // ลบรูปเดิมออกจาก storage (ถ้ามี)
        if (isCurrentStored) {
          const path = pathFromPublicUrl(profile.image);
          if (path) {
            const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
            if (rmErr) console.warn("remove avatar warn:", rmErr.message);
          }
        }
        newAvatarUrl = null;
      } else if (previewImage && previewImage.startsWith("blob:")) {
        // มีการอัปโหลดรูปใหม่
        // ลบไฟล์เก่า (optional)
        if (isCurrentStored) {
          const path = pathFromPublicUrl(profile.image);
          if (path) {
            const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
            if (rmErr) console.warn("remove old before replace warn:", rmErr.message);
          }
        }
        // อัปโหลดไฟล์ใหม่
        const file = await fetch(previewImage).then((r) => r.blob());
        const filename = "avatar.png"; // ชื่อชั่วคราว
        const fileWithName = new File([file], filename, { type: file.type || "image/png" });
        newAvatarUrl = await uploadAvatarToStorage(fileWithName, userId);
      }

      // 2) อัปเดต DB
      const { error: upErr } = await supabase
        .from("users")
        .update({
          profile_pic: newAvatarUrl || null,
          name: form.name || null,
          username: form.username || null,
        })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      // 3) sync ไป auth metadata (best effort)
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          name: form.name || null,
          username: form.username || null,
          profile_pic: newAvatarUrl || null,
        },
      });
      if (authErr) console.warn("auth.updateUser warning:", authErr.message);

      // 4) อัปเดตค่า “ของจริง” ให้หัวข้อ/รูปด้านบนเปลี่ยนหลัง Save เท่านั้น
      setProfile((prev) => ({
        image: newAvatarUrl || DEFAULT_AVATAR,
        name: form.name,
        username: form.username,
        email: prev.email,
      }));

      // 5) เคลียร์สถานะแก้ไขรูป
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
      setPreviewImage(null);
      setPendingRemove(false);

      await fetchUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update", { description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  /* ================== UI ================== */
  return (
    <div className="min-h-screen md:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden">
        {/* Desktop Header — ใช้รูป/ชื่อ “ของจริง” */}
        <div className="hidden items-center p-6 md:flex">
          <CircleAvatar src={headerImage} alt="Profile" size={56} className="mr-4" />
          <div>
            <h1 className="text-2xl font-bold">{profile.name || "Profile"}</h1>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="p-4 md:hidden">
          <div className="mb-4 flex items-center justify-start gap-12">
            <div className="flex items-center space-x-2 font-medium text-foreground">
              <User className="mb-1 h-5 w-5" />
              <span>Profile</span>
            </div>
            <button
              onClick={() => navigate("/reset-password")}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              <Lock className="mb-1 h-5 w-5" />
              Reset password
            </button>
          </div>
          <div className="flex items-center">
            <CircleAvatar src={headerImage} alt="Profile" size={40} />
            <h2 className="ml-3 text-xl font-semibold">
              {profile.name || "Your name"}
            </h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="hidden w-64 p-6 md:block">
            <nav>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 font-medium text-foreground">
                  <User className="mb-1 h-5 w-5" />
                  <span>Profile</span>
                </div>
                <button
                  onClick={() => navigate("/reset-password")}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  <Lock className="mb-1 h-5 w-5" />
                  Reset password
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Card */}
          <main className="flex-1 bg-[#EFEEEB] p-8 md:m-2 md:rounded-lg md:shadow-md">
            {/* avatar + upload/remove (ใช้รูป editImage เพื่อ preview เฉพาะในฟอร์ม) */}
            <div className="mb-6 flex flex-col items-center justify-start gap-6 md:flex-row md:gap-6">
              <div className="relative inline-block">
                <CircleAvatar src={editImage} alt="Edit preview" size={112} className="mb-5" />
                <button
                  type="button"
                  title="Remove picture"
                  aria-label="Remove picture"
                  onClick={handleMarkRemoveAvatar}
                  className="absolute -right-2 -top-2 cursor-pointer rounded-full border border-stone-300 bg-white/95 p-1 shadow transition hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="cursor-pointer rounded-full border border-foreground bg-background px-8 py-2 text-foreground transition-colors hover:border-muted-foreground hover:text-muted-foreground">
                Upload profile picture
                <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>

            {/* form */}
            {loading ? (
              <div className="text-sm text-stone-500">Loading…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="mt-1 rounded-sm py-3 placeholder:text-muted-foreground focus-visible:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleInputChange}
                    className="mt-1 rounded-sm py-3 placeholder:text-muted-foreground focus-visible:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input id="email" name="email" type="email" value={profile.email} disabled className="bg-gray-100" />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 rounded-full bg-foreground px-8 py-2 text-white transition-colors hover:bg-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}