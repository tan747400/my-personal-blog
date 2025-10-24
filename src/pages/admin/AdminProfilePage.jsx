import { useEffect, useState } from "react";
import supabase from "@/lib/db";
import { AdminSidebar } from "@/components/AdminWebSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

/**
 * ตรงนี้ผูกกับโครงตาราง users
 * users(id uuid, username varchar, name varchar, profile_pic text, role varchar, bio text?) 
 */

export default function AdminProfilePage() {
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    profile_pic: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        // 1) auth user
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id ?? null;
        setUserId(uid);

        if (!uid) {
          toast.error("Not logged in");
          return;
        }

        // 2) email จาก auth
        const email = auth.user.email ?? "";

        // 3) profile จาก public.users
        const { data: profile, error } = await supabase
          .from("users")
          .select("username,name,profile_pic,role,bio")
          .eq("id", uid)
          .single();

        if (error) throw error;

        if (!active) return;
        setForm({
          name: profile?.name ?? "",
          username: profile?.username ?? "",
          email,
          profile_pic: profile?.profile_pic ?? "",
          bio: profile?.bio ?? "",
        });
      } catch (e) {
        console.error(e);
        if (!active) return;
        toast.error("Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const onChange = (k) => (e) =>
    setForm((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    if (!userId) return;
    const payload = {
      username: form.username,
      name: form.name,
      profile_pic: form.profile_pic,
      bio: form.bio,
    };
    const { error } = await supabase.from("users").update(payload).eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />

      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Profile</h2>
          <Button className="px-8 py-2 rounded-full" onClick={save} disabled={loading}>
            Save
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : (
          <div>
            <div className="flex items-center mb-6">
              <Avatar className="w-24 h-24 mr-4">
                <AvatarImage src={form.profile_pic} alt="Profile picture" />
                <AvatarFallback>
                  {form.username?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {/* อนาคตถ้าอยากอัปโหลดไฟล์จริง ให้ต่อ Supabase Storage ได้ */}
              <Input
                placeholder="Profile picture URL"
                value={form.profile_pic}
                onChange={onChange("profile_pic")}
                className="max-w-md"
              />
            </div>

            <form className="space-y-7 max-w-2xl" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="name">Name</label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={onChange("name")}
                  className="mt-1 py-3"
                />
              </div>
              <div>
                <label htmlFor="username">Username</label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={onChange("username")}
                  className="mt-1 py-3"
                />
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <Input id="email" type="email" value={form.email} disabled className="mt-1 py-3" />
              </div>
              <div>
                <label htmlFor="bio">Bio (max 120 letters)</label>
                <Textarea
                  id="bio"
                  rows={8}
                  value={form.bio}
                  onChange={onChange("bio")}
                  maxLength={120}
                  className="mt-1 py-3"
                />
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}