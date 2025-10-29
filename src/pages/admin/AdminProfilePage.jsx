import { useEffect, useRef, useState, useMemo } from "react";
import supabase from "@/lib/db";
import { AdminSidebar } from "@/components/AdminWebSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/authentication";

const BUCKET = "avatars"; // ชื่อ bucket ใน Supabase Storage ที่เก็บรูปโปรไฟล์
const DEFAULT_AVATAR = "/avatar-default.svg"; // รูป default ถ้า user ยังไม่มีรูป

// ฟังก์ชัน bust(url)
// เอาไว้เติม query param ?v=timestamp เข้าไปใน URL ของรูป
// เพื่อบังคับ browser โหลดรูปใหม่ไม่ใช้ cache (ยกเว้นเป็น blob:/data:)
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

// ฟังก์ชัน pathFromPublicUrl(url)
// ทำงานย้อนกลับจาก public URL -> path ใน storage (เช่น userId/xxxx.png)
// เพราะ remove() ต้องใช้ path ดิบ ไม่ใช่ public URL
function pathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const needle = `/object/public/${BUCKET}/`;
    const i = u.pathname.indexOf(needle);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + needle.length)) || null;
  } catch {
    // fallback เผื่อ new URL ล้มเหลว
    const m = url.match(new RegExp(`/object/public/${BUCKET}/(.+)$`));
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}

// อัปโหลดรูป avatar ไปที่ Supabase Storage
// คืนค่าเป็น publicUrl ของไฟล์ที่อัปโหลดเสร็จ
async function uploadAvatarToStorage(file, userId) {
  // sanitize ชื่อไฟล์ไม่ให้มีตัวอักษรประหลาด
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const filePath = `${userId}/${Date.now()}-${safeName}`; // path: userId/timestamp-filename

  // อัปโหลดไฟล์ขึ้น bucket
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false, // ไม่ทับไฟล์ชื่อเดิม
    });

  if (uploadErr) throw new Error(uploadErr.message);

  // ขอ public URL ของไฟล์นั้นกลับมา
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

export default function AdminProfilePage() {
  // ดึง auth state ปัจจุบัน และฟังก์ชัน fetchUser() เพื่อ refresh user หลังอัปเดตข้อมูล
  const { state, fetchUser } = useAuth();
  const authUser = state.user; // user ที่ login อยู่ตอนนี้ (จาก supabase.auth)

  // refs เอาไว้ควบคุม input[type=file] ที่ซ่อนอยู่ และ blob URL ล่าสุด
  const fileInputRef = useRef(null);
  const lastBlobUrlRef = useRef(null);

  // state loading ต่าง ๆ
  const [loading, setLoading] = useState(true); // โหลดข้อมูลโปรไฟล์อยู่ไหม
  const [saving, setSaving] = useState(false); // กำลังกด Save อยู่ไหม
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // กำลังอัปโหลดรูปอยู่ไหม

  // state ของฟอร์มโปรไฟล์ที่โชว์บนหน้า
  const [profile, setProfile] = useState({
    image: DEFAULT_AVATAR, // รูปโปรไฟล์ (อาจเป็น URL public หรือ blob preview)
    name: "",
    username: "",
    email: "",
    bio: "",
  });

  // ใช้กัน bug: เราจะ setForm จาก DB แค่ครั้งแรกเท่านั้น
  // (กันไม่ให้ useEffect ไป overwrite ค่าใหม่หลังจากที่ผู้ใช้เริ่มแก้ฟอร์มแล้ว)
  const [initialized, setInitialized] = useState(false);

  // เก็บไฟล์รูปใหม่ที่ user เพิ่งเลือก (ยังไม่อัปขึ้น storage จริง)
  const [imageFile, setImageFile] = useState(null);

  // displayImage = bust(profile.image)
  // bust() = เติม query กัน cache ถ้าเป็น URL ปกติ
  const displayImage = useMemo(() => bust(profile.image), [profile.image]);

  // useEffect:
  // โหลดข้อมูลผู้ใช้จาก DB (ตาราง users) ครั้งแรกที่มี authUser
  useEffect(() => {
    let alive = true; // flag กัน setState หลัง component unmount

    // ถ้าไม่มี authUser (ยังไม่รู้ว่าใคร login) หรือโหลดไปแล้ว (initialized) ก็ไม่ต้องทำซ้ำ
    if (!authUser || initialized) return;

    (async () => {
      try {
        setLoading(true);

        const userId = authUser.id;
        const email = authUser.email || "";

        // ดึงข้อมูลเพิ่มจากตาราง "users"
        const { data: row, error: rowErr } = await supabase
          .from("users")
          .select("username,name,profile_pic,bio")
          .eq("id", userId)
          .single();

        if (rowErr) {
          console.warn("users row load warning:", rowErr.message);
        }

        if (!alive) return;

        // set ค่าเข้า form จาก 2 แหล่ง:
        // - row ใน DB (ตาราง users)
        // - user_metadata ของ supabase.auth (สำรอง)
        setProfile({
          image:
            row?.profile_pic ||
            authUser.user_metadata?.profile_pic ||
            authUser.user_metadata?.avatar_url ||
            DEFAULT_AVATAR,
          name: row?.name || authUser.user_metadata?.name || "",
          username: row?.username || authUser.user_metadata?.username || "",
          email,
          bio: row?.bio || "",
        });

        setInitialized(true); // บอกว่าเรา init form แล้ว
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
      // cleanup เมื่อ component ถูก unmount
      alive = false;
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current); // ลบ blob URL เก่าเพื่อไม่ให้ memory leak
        lastBlobUrlRef.current = null;
      }
    };
  }, [authUser, initialized]);

  // helper สำหรับอัปเดต field ในฟอร์ม
  // ใช้แบบ onChange={onFieldChange("name")}
  const onFieldChange = (field) => (e) => {
    const val = e.target.value;
    setProfile((prev) => ({
      ...prev,
      [field]: field === "bio" ? val.slice(0, 360) : val, // bio limit 360 char
    }));
  };

  // กดปุ่ม "Upload profile picture" -> ให้คลิก input file ที่ซ่อนอยู่
  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  // ตอน user เลือกรูปจากเครื่อง:
  // - validate ประเภทไฟล์ / ขนาดไฟล์
  // - สร้าง blob URL เพื่อ preview ก่อน (ยังไม่อัปจริง)
  const handleAvatarFileLocal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Use JPEG/PNG/GIF/WebP.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 5MB." });
      return;
    }

    // เคลียร์ blob เดิมถ้ามี (กัน memory leak)
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }

    // สร้าง preview ชั่วคราว
    const blobUrl = URL.createObjectURL(file);
    lastBlobUrlRef.current = blobUrl;

    setImageFile(file); // เก็บไฟล์จริงไว้รออัปโหลดตอนกด Save
    setProfile((p) => ({ ...p, image: blobUrl })); // เปลี่ยนรูปใน UI ให้เห็นก่อน
  };

  // ลบรูปโปรไฟล์:
  // - ลบไฟล์ใน storage (ถ้าไฟล์นั้นเป็นของจริง ไม่ใช่ blob preview)
  // - อัปเดตทั้งตาราง users และ user_metadata ใน auth
  // - ตั้งรูปกลับเป็น DEFAULT_AVATAR
  const handleRemoveAvatar = async () => {
    if (!authUser) return toast.error("Not signed in.");
    const userId = authUser.id;
    const current = profile.image;

    try {
      // เช็คว่ารูปตอนนี้เป็นไฟล์ที่อัปโหลดไว้จริง ๆ รึยัง (ไม่ใช่ blob, ไม่ใช่ default)
      const isDeletable =
        !!current &&
        !current.startsWith("blob:") &&
        !current.startsWith("data:") &&
        current !== DEFAULT_AVATAR;

      // ถ้าใช่ -> หา path แล้วสั่งลบใน storage
      if (isDeletable) {
        const path = pathFromPublicUrl(current);
        if (path) {
          const { error: rmErr } = await supabase
            .storage
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

      // อัปเดต metadata ใน auth ด้วย (จะมีผลกับ state.user.user_metadata)
      const { error: authErr } = await supabase.auth.updateUser({
        data: { profile_pic: null },
      });
      if (authErr) {
        console.warn("auth.updateUser warning:", authErr.message);
      }

      // เคลียร์สถานะไฟล์ local preview
      setImageFile(null);
      if (lastBlobUrlRef.current) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }

      // อัปเดต state ให้กลับเป็น default avatar
      setProfile((p) => ({ ...p, image: DEFAULT_AVATAR }));

      // refresh user context อีกครั้ง
      await fetchUser();

      toast.success("Removed profile picture");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove picture", {
        description: err?.message,
      });
    }
  };

  // กดปุ่ม Save:
  // - ถ้ามีเลือกไฟล์ใหม่ -> อัปโหลดไฟล์ขึ้น storage แล้วได้ publicUrl ใหม่
  // - อัปเดตตาราง users (name, username, bio, profile_pic)
  // - อัปเดต metadata ของ auth (เพื่อให้ state.user sync)
  // - ดึงข้อมูลล่าสุดจาก DB กลับมาใส่ฟอร์มอีกครั้ง
  const handleSave = async () => {
    if (!authUser) return toast.error("Not signed in.");
    const userId = authUser.id;

    try {
      setSaving(true);

      let newAvatarUrl = profile.image;

      // ถ้ามีไฟล์ใหม่ -> อัปขึ้น storage จริง
      if (imageFile) {
        setUploadingAvatar(true);
        newAvatarUrl = await uploadAvatarToStorage(imageFile, userId);

        // clear blob preview เก่า
        if (lastBlobUrlRef.current) {
          URL.revokeObjectURL(lastBlobUrlRef.current);
          lastBlobUrlRef.current = null;
        }
        setImageFile(null);
        setUploadingAvatar(false);

        // อัปเดตใน state ให้เป็น URL จริง (publicUrl)
        setProfile((p) => ({ ...p, image: newAvatarUrl }));
      }

      // อัปเดตข้อมูลลงตาราง users
      const { error: upErr } = await supabase
        .from("users")
        .update({
          profile_pic:
            newAvatarUrl && newAvatarUrl !== DEFAULT_AVATAR
              ? newAvatarUrl
              : null,
          name: profile.name || null,
          username: profile.username || null,
          bio: profile.bio || null,
        })
        .eq("id", userId);

      if (upErr) throw new Error(upErr.message);

      // อัปเดต metadata ใน auth ด้วย (เพื่อ sync กับ useAuth())
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

      // ดึงข้อมูลล่าสุดกลับมาจาก DB เพื่ออัปเดตฟอร์มที่โชว์
      const { data: freshRow, error: freshErr } = await supabase
        .from("users")
        .select("username,name,profile_pic,bio")
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
          bio: freshRow.bio || "",
        }));
        // initialized ยังเป็น true -> แปลว่าเราไม่ re-init ซ้ำจาก useEffect
      } else if (freshErr) {
        console.warn("re-fetch after save warn:", freshErr.message);
      }

      // sync global user context อีกครั้ง
      await fetchUser();

      toast.success("Saved");
    } catch (err) {
      console.error("Save failed full:", err);
      toast.error("Save failed", {
        description: err?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* แถบเมนูฝั่งซ้ายของหน้า Admin */}
      <AdminSidebar />

      {/* เนื้อหาหลักด้านขวา */}
      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        {/* แถวบนของหน้า: ชื่อหน้า + ปุ่ม Save */}
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-2xl font-semibold text-stone-900">Profile</h2>

          <Button
            className="cursor-pointer rounded-full bg-stone-900 px-8 py-2 text-white hover:bg-stone-800"
            onClick={handleSave}
            disabled={loading || saving || uploadingAvatar}
          >
            {saving || uploadingAvatar ? "Saving…" : "Save"}
          </Button>
        </div>

        {/* ถ้ายังโหลดข้อมูล user ไม่เสร็จ -> แสดง Loading… */}
        {loading || !authUser ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : (
          <>
            {/* ส่วนเปลี่ยนรูปโปรไฟล์ */}
            <div className="mb-6 flex max-w-2xl flex-col sm:flex-row sm:items-center sm:gap-6">
              <div className="relative flex-shrink-0">
                {/* Avatar กลม ๆ */}
                <Avatar className="h-24 w-24 border border-stone-300 bg-white shadow-sm">
                  {/* รูปจริง (จาก displayImage) */}
                  <AvatarImage
                    src={displayImage}
                    alt={profile.username || "Profile picture"}
                    className="object-cover"
                  />
                  {/* fallback ถ้าไม่มีรูป -> ใช้ตัวอักษรตัวแรกของ username */}
                  <AvatarFallback className="bg-lime-200 text-lg font-semibold text-stone-800">
                    {profile.username?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>

                {/* ปุ่มกากบาทลบรูป (ถ้าไม่ได้ใช้ default) */}
                {profile.image && profile.image !== DEFAULT_AVATAR && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-stone-400 bg-white text-stone-700 shadow hover:bg-stone-100 cursor-pointer"
                    title="Remove profile picture"
                    aria-label="Remove profile picture"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* ปุ่มอัปโหลดรูป + input file ที่ซ่อนอยู่ */}
              <div className="flex flex-col justify-center">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploadingAvatar}
                  className="min-w-[220px] inline-flex items-center justify-center rounded-full border border-stone-700 bg-white px-6 py-2 text-[15px] font-medium text-stone-900 shadow-sm hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingAvatar ? "Uploading…" : "Upload profile picture"}
                </button>

                {/* input file จริง ๆ แต่ซ่อนไว้ */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileLocal}
                />
              </div>
            </div>

            {/* ฟอร์มแก้ไขข้อมูลโปรไฟล์ */}
            <form
              className="max-w-2xl space-y-7"
              onSubmit={(e) => e.preventDefault()} // กันไม่ให้ submit form reload หน้า
            >
              {/* Name */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-stone-800">
                  Name
                </label>
                <Input
                  value={profile.name}
                  onChange={onFieldChange("name")}
                  className="mt-1 bg-white py-3"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-stone-800">
                  Username
                </label>
                <Input
                  value={profile.username}
                  onChange={onFieldChange("username")}
                  className="mt-1 bg-white py-3"
                />
              </div>

              {/* Email (อ่านได้อย่างเดียว / disable) */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-stone-800">
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 bg-stone-100 py-3 text-stone-500"
                />
              </div>

              {/* Bio (textarea) */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-stone-800">
                  Bio (max 360 letters)
                </label>
                <Textarea
                  rows={8}
                  maxLength={360}
                  value={profile.bio}
                  onChange={onFieldChange("bio")}
                  className="mt-1 bg-white py-3"
                  placeholder="Tell people a bit about you…"
                />
                <div className="mt-1 text-[12px] text-stone-500">
                  {profile.bio.length}/360
                </div>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}