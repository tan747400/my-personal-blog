import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authentication";
import { toast } from "sonner";
import supabase from "@/lib/db";
import CircleAvatar from "@/components/CircleAvatar";

const BUCKET = "avatars";
const DEFAULT_AVATAR = "/avatar-default.svg";

// เพิ่มความปลอดภัย: ไม่ใส่ cache-busting ให้ blob:/data:
const bust = (url) => {
  const safeUrl = url || DEFAULT_AVATAR;
  if (safeUrl.startsWith("blob:") || safeUrl.startsWith("data:")) return safeUrl;
  try {
    const u = new URL(safeUrl, window.location.origin);
    u.searchParams.set("v", Date.now().toString());
    return u.toString();
  } catch {
    return `${safeUrl}${safeUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
  }
};

// ดึง path ของไฟล์จาก public URL ของ Supabase Storage
// คืนค่า: "<path>" เพื่อนำไป .remove()
function pathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const needle = `/object/public/${BUCKET}/`;
    const i = u.pathname.indexOf(needle);
    if (i === -1) return null;
    const path = decodeURIComponent(u.pathname.slice(i + needle.length));
    return path || null;
  } catch {
    // เผื่อเป็น URL แบบไม่ครบ ให้ fallback regex ง่ายๆ
    const m = url.match(new RegExp(`/object/public/${BUCKET}/(.+)$`));
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { state, fetchUser } = useAuth();

  const [profile, setProfile] = useState({
    image: DEFAULT_AVATAR,
    name: "",
    username: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  // เก็บ blob URL ล่าสุดไว้เพื่อลบทิ้งตอนเปลี่ยนรูป/ออกจากหน้า
  const lastBlobUrlRef = useRef(null);

  // รูปสำหรับโชว์ (ถ้าเป็น http/https เติม cache-busting, ถ้า blob/data ไม่เติม)
  const displayImage = useMemo(() => bust(profile.image), [profile.image]);

  useEffect(() => {
    const u = state.user;
    setProfile({
      image:
        u?.user_metadata?.profile_pic ||
        u?.user_metadata?.avatar_url ||
        DEFAULT_AVATAR,
      name: u?.user_metadata?.name || "",
      username: u?.user_metadata?.username || "",
      email: u?.email || "",
    });
  }, [state.user]);

  useEffect(() => {
    return () => {
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return toast.error("Invalid file type", { description: "Use JPEG/PNG/GIF/WebP." });
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File too large", { description: "Max 5MB." });
    }

    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }

    const blobUrl = URL.createObjectURL(file);
    lastBlobUrlRef.current = blobUrl;

    setImageFile(file);
    setProfile((p) => ({ ...p, image: blobUrl }));
  };

  const uploadAvatarToStorage = async (file, userId) => {
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadErr) throw new Error(uploadErr.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || "";
  };

  // ✅ ลบรูป: ลบไฟล์ใน storage (ถ้าพบ path) + เคลียร์ DB/Auth + ใช้ default
  const handleRemoveAvatar = async () => {
    if (!state.user) return toast.error("Not signed in.");
    const userId = state.user.id;

    try {
      // ถ้าเป็น URL ที่ชี้ไปไฟล์จริง (ไม่ใช่ blob/data/default) ให้ลองลบใน storage
      const current = profile.image;
      const isDeletable =
        !!current &&
        !current.startsWith("blob:") &&
        !current.startsWith("data:") &&
        current !== DEFAULT_AVATAR;

      if (isDeletable) {
        const path = pathFromPublicUrl(current);
        if (path) {
          const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
          if (rmErr) {
            // ถ้าลบไม่ได้ก็ไม่เป็นไร แค่แจ้งเตือน
            console.warn("remove avatar warn:", rmErr.message);
          }
        }
      }

      // อัปเดตตาราง users → profile_pic = null
      const { error: upErr } = await supabase
        .from("users")
        .update({ profile_pic: null })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      // อัปเดต Auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { profile_pic: null },
      });
      if (authErr) console.warn("auth.updateUser warning:", authErr.message);

      // อัปเดตสถานะ UI → ใช้ default
      setImageFile(null);
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
      setProfile((p) => ({ ...p, image: DEFAULT_AVATAR }));

      await fetchUser();
      toast.success("Removed profile picture");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove picture", { description: err?.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state.user) return toast.error("Not signed in.");

    try {
      setIsSaving(true);
      const userId = state.user.id;
      let newAvatarUrl = profile.image;

      if (imageFile) {
        newAvatarUrl = await uploadAvatarToStorage(imageFile, userId);

        setProfile((p) => ({ ...p, image: newAvatarUrl }));

        if (lastBlobUrlRef.current) {
          URL.revokeObjectURL(lastBlobUrlRef.current);
          lastBlobUrlRef.current = null;
        }
      }

      const { error: upErr } = await supabase
        .from("users")
        .update({
          profile_pic: newAvatarUrl && newAvatarUrl !== DEFAULT_AVATAR ? newAvatarUrl : null,
          name: profile.name || null,
          username: profile.username || null,
        })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          name: profile.name || null,
          username: profile.username || null,
          profile_pic: newAvatarUrl && newAvatarUrl !== DEFAULT_AVATAR ? newAvatarUrl : null,
        },
      });
      if (authErr) console.warn("auth.updateUser warning:", authErr.message);

      await fetchUser();
      toast.success("Profile updated successfully");
      setImageFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update", { description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen md:p-8">
      <div className="max-w-4xl mx-auto overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center p-6">
          <CircleAvatar src={displayImage} alt="Profile" size={56} className="mr-4" />
          <div>
            <h1 className="text-2xl font-bold">{profile.name || "Profile"}</h1>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden p-4">
          <div className="flex justify-start gap-12 items-center mb-4">
            <div className="flex items-center space-x-2 font-medium text-foreground">
              <User className="h-5 w-5 mb-1" />
              <span>Profile</span>
            </div>
            <button
              onClick={() => navigate("/reset-password")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lock className="h-5 w-5 mb-1" />
              Reset password
            </button>
          </div>
          <div className="flex items-center">
            <CircleAvatar src={displayImage} alt="Profile" size={40} />
            <h2 className="ml-3 text-xl font-semibold">{profile.name || "Your name"}</h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="hidden md:block w-64 p-6">
            <nav>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 font-medium text-foreground">
                  <User className="h-5 w-5 mb-1" />
                  <span>Profile</span>
                </div>
                <button
                  onClick={() => navigate("/reset-password")}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Lock className="h-5 w-5 mb-1" />
                  Reset password
                </button>
              </div>
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 p-8 bg-[#EFEEEB] md:m-2 md:shadow-md md:rounded-lg">
            <div className="flex flex-col md:flex-row items-center justify-start md:gap-6 mb-6">
              {/* กล่องรูป + ปุ่มลบ */}
              <div className="relative inline-block">
                <CircleAvatar src={displayImage} alt="Profile" size={112} className="mb-5" />
                <button
                  type="button"
                  title="Remove picture"
                  aria-label="Remove picture"
                  onClick={handleRemoveAvatar}
                  className="absolute -right-2 -top-2 rounded-full bg-white/95 border border-stone-300 p-1 shadow hover:bg-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="bg-background px-8 py-2 rounded-full text-foreground border border-foreground hover:border-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer">
                Upload profile picture
                <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  className="mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  value={profile.username}
                  onChange={handleInputChange}
                  className="mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input id="email" name="email" type="email" value={profile.email} disabled className="bg-gray-100" />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-2 mt-2 bg-foreground text-white rounded-full hover:bg-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}