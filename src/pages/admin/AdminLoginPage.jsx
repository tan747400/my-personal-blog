import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import supabase from "@/lib/db";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isErrorEmail, setIsErrorEmail] = useState(false);
  const [isErrorPassword, setIsErrorPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    let valid = true;
    if (!email.trim()) { setIsErrorEmail(true); valid = false; } else setIsErrorEmail(false);
    if (!password.trim()) { setIsErrorPassword(true); valid = false; } else setIsErrorPassword(false);
    if (!valid) return;

    // 1) ล็อกอิน
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }

    const authUser = signInData.user;
    if (!authUser) {
      toast.error("Cannot sign in.");
      return;
    }

    try {
      // 2) อ่าน role จาก public.users ตาม uid (ต้องมีคอลัมน์ id = auth.uid())
      const { data: row, error: roleErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (roleErr) throw roleErr;

      const role = row?.role?.toLowerCase();

      if (role !== "admin") {
        // ไม่ใช่แอดมิน → ออก + เด้งหน้าแรก
        await supabase.auth.signOut();
        toast.error("You are not an admin.");
        navigate("/");
        return;
      }

      // 3) (ออปชัน) sync role เข้า user_metadata เพื่อให้ส่วนอื่น ๆ ที่อ่าน metadata ใช้ได้ด้วย
      await supabase.auth.updateUser({ data: { role: "admin" } }).catch(() => {});

      toast.success("Welcome, admin!");
      navigate("/admin/article-management");
    } catch (e2) {
      console.error(e2);
      await supabase.auth.signOut();
      toast.error("Cannot verify admin role.");
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex justify-center items-center p-4 my-4 flex-grow">
        <div className="w-full max-w-2xl bg-[#EFEEEB] rounded-sm shadow-md px-3 sm:px-20 py-14">
          <p className="text-md text-orange-300 text-center mb-4">Admin panel</p>
          <h2 className="text-4xl font-semibold text-center mb-6">Log in</h2>
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="relative space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">Email</label>
              <Input
                id="email" type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 py-3 ${isErrorEmail ? "border-red-500" : ""}`}
              />
              {isErrorEmail && <p className="text-red-500 text-xs absolute">Please enter a valid email.</p>}
            </div>
            <div className="relative space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">Password</label>
              <Input
                id="password" type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 py-3 ${isErrorPassword ? "border-red-500" : ""}`}
              />
              {isErrorPassword && <p className="text-red-500 text-xs absolute">Please enter your password.</p>}
            </div>
            <div className="flex justify-center">
              <button type="submit" className="px-8 py-2 bg-foreground text-white rounded-full hover:bg-muted-foreground">
                Log in
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}