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

// upload file to storage, return public URL
async function uploadAvatarToStorage(file, userId) {
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const filePath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { state, fetchUser } = useAuth();
  const authUser = state.user; // Supabase auth user

  const lastBlobUrlRef = useRef(null);

  const [profile, setProfile] = useState({
    image: DEFAULT_AVATAR,
    name: "",
    username: "",
    email: "",
  });

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const displayImage = useMemo(() => bust(profile.image), [profile.image]);

  // 1) โหลดข้อมูล "ครั้งแรกที่เข้าเพจ" จาก DB
  useEffect(() => {
    let alive = true;

    if (!authUser || initialized) return;

    (async () => {
      try {
        setLoading(true);

        const userId = authUser.id;
        const email = authUser.email || "";

        // ดึงข้อมูลจริงจาก public.users
        const { data: row, error: rowErr } = await supabase
          .from("users")
          .select("username,name,profile_pic")
          .eq("id", userId)
          .single();

        if (rowErr) {
          console.warn("users row load warning:", rowErr.message);
        }

        if (!alive) return;

        setProfile({
          image:
            row?.profile_pic ||
            authUser.user_metadata?.profile_pic ||
            authUser.user_metadata?.avatar_url ||
            DEFAULT_AVATAR,
          name: row?.name || authUser.user_metadata?.name || "",
          username: row?.username || authUser.user_metadata?.username || "",
          email,
        });

        setInitialized(true); // บอกว่าฟอร์มถูกตั้งค่าแล้ว
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
      // cleanup blob preview URL ถ้ามี
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
    };
  }, [authUser, initialized]);

  // 2) handle text field change (name, username)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 3) local preview avatar (blob:) ยังไม่อัปจริง
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Use JPEG/PNG/GIF/WebP.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Max 5MB.",
      });
      return;
    }

    // cleanup old blob preview
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }

    const blobUrl = URL.createObjectURL(file);
    lastBlobUrlRef.current = blobUrl;

    setImageFile(file);
    setProfile((p) => ({ ...p, image: blobUrl }));
  };

  // 4) remove avatar -> ลบจาก storage (ถ้าเป็นไฟล์จริง), เซ็ต default, sync DB
  const handleRemoveAvatar = async () => {
    if (!authUser) return toast.error("Not signed in.");
    const userId = authUser.id;
    const current = profile.image;

    try {
      // ถ้ารูปตอนนี้เป็น URL จริงใน storage (ไม่ใช่ blob:/data:/default)
      const isDeletable =
        !!current &&
        !current.startsWith("blob:") &&
        !current.startsWith("data:") &&
        current !== DEFAULT_AVATAR;

      if (isDeletable) {
        const path = pathFromPublicUrl(current);
        if (path) {
          const { error: rmErr } = await supabase.storage
            .from(BUCKET)
            .remove([path]);
          if (rmErr) {
            console.warn("remove avatar warn:", rmErr.message);
          }
        }
      }

      // อัปเดตตาราง users ให้ profile_pic = null
      const { error: upErr } = await supabase
        .from("users")
        .update({ profile_pic: null })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      // sync ไปที่ auth metadata ด้วย (best-effort)
      const { error: authErr } = await supabase.auth.updateUser({
        data: { profile_pic: null },
      });
      if (authErr) {
        console.warn("auth.updateUser warning:", authErr.message);
      }

      // อัปเดต state UI -> default avatar
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
      toast.error("Failed to remove picture", {
        description: err?.message,
      });
    }
  };

  // 5) save (อัปโหลดรูปหากมี, upsert users, sync auth, refetch DB)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) return toast.error("Not signed in.");

    try {
      setIsSaving(true);

      const userId = authUser.id;
      let newAvatarUrl = profile.image;

      // ถ้าพึ่งเลือกไฟล์ใหม่ → อัปขึ้น storage ก่อน
      if (imageFile) {
        newAvatarUrl = await uploadAvatarToStorage(imageFile, userId);

        // อัปเดต preview ใน state เป็น URL จริง
        setProfile((p) => ({ ...p, image: newAvatarUrl }));

        // เคลียร์ blob URL เดิม
        if (lastBlobUrlRef.current) {
          URL.revokeObjectURL(lastBlobUrlRef.current);
          lastBlobUrlRef.current = null;
        }
        setImageFile(null);
      }

      // อัปเดตตาราง users ให้เป็นของจริง
      const { error: upErr } = await supabase
        .from("users")
        .update({
          profile_pic:
            newAvatarUrl && newAvatarUrl !== DEFAULT_AVATAR
              ? newAvatarUrl
              : null,
          name: profile.name || null,
          username: profile.username || null,
        })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      // sync auth metadata ด้วย (เพื่อ header อื่น ๆ จะเห็นชื่อใหม่)
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          name: profile.name || null,
          username: profile.username || null,
          profile_pic:
            newAvatarUrl && newAvatarUrl !== DEFAULT_AVATAR
              ? newAvatarUrl
              : null,
        },
      });
      if (authErr) {
        console.warn("auth.updateUser warning:", authErr.message);
      }

      // ดึงข้อมูลล่าสุดจาก DB อีกรอบ แล้วเขียนทับฟอร์ม
      const { data: freshRow, error: freshErr } = await supabase
        .from("users")
        .select("username,name,profile_pic")
        .eq("id", userId)
        .maybeSingle();

      if (!freshErr && freshRow) {
        setProfile((prev) => ({
          image:
            freshRow.profile_pic ||
            newAvatarUrl ||
            DEFAULT_AVATAR,
          name: freshRow.name || "",
          username: freshRow.username || "",
          email: prev.email || "",
        }));
        // initialized คงเป็น true อยู่เหมือนเดิม
      } else if (freshErr) {
        console.warn("re-fetch after save warn:", freshErr.message);
      }

      await fetchUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update", {
        description: err?.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen md:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden items-center p-6 md:flex">
          <CircleAvatar
            src={displayImage}
            alt="Profile"
            size={56}
            className="mr-4"
          />
          <div>
            <h1 className="text-2xl font-bold">
              {profile.name || "Profile"}
            </h1>
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
            <CircleAvatar src={displayImage} alt="Profile" size={40} />
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
            {/* avatar + upload/remove */}
            <div className="mb-6 flex flex-col items-center justify-start gap-6 md:flex-row md:gap-6">
              {/* avatar with remove button */}
              <div className="relative inline-block">
                <CircleAvatar
                  src={displayImage}
                  alt="Profile"
                  size={112}
                  className="mb-5"
                />
                <button
                  type="button"
                  title="Remove picture"
                  aria-label="Remove picture"
                  onClick={handleRemoveAvatar}
                  className="absolute -right-2 -top-2 cursor-pointer rounded-full border border-stone-300 bg-white/95 p-1 shadow transition hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* upload input */}
              <label className="cursor-pointer rounded-full border border-foreground bg-background px-8 py-2 text-foreground transition-colors hover:border-muted-foreground hover:text-muted-foreground">
                Upload profile picture
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </label>
            </div>

            {/* form */}
            {loading ? (
              <div className="text-sm text-stone-500">Loading…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className="mt-1 rounded-sm py-3 placeholder:text-muted-foreground focus-visible:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    value={profile.username}
                    onChange={handleInputChange}
                    className="mt-1 rounded-sm py-3 placeholder:text-muted-foreground focus-visible:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-100"
                  />
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