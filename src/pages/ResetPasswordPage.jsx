import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { User, Lock, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/authentication";
import axios from "axios";

// ใช้ตัวเดียวกับหน้าโปรไฟล์ เพื่อให้รูปวงกลม/ขนาดเหมือนกัน
import CircleAvatar from "@/components/CircleAvatar";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { state } = useAuth();

  // ===== ดึง URL รูปและชื่อให้เหมือนหน้า Profile =====
  const u = state.user;
  const avatarUrl =
    u?.user_metadata?.profile_pic || u?.user_metadata?.avatar_url || "";
  const displayName =
    u?.user_metadata?.name ||
    u?.user_metadata?.username ||
    (u?.email ? u.email.split("@")[0] : "") ||
    "Account";
  const initials =
    (displayName?.match(/[A-Za-zก-ฮ0-9]/g) || []).slice(0, 2).join("").toUpperCase() || "U";

  // ===== ฟอร์มรีเซ็ตรหัส =====
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [valid, setValid] = useState({
    password: true,
    newPassword: true,
    confirmNewPassword: true,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const isValidPassword = password.trim() !== "";
    const isValidNewPassword = newPassword.trim() !== "" && newPassword.length >= 8;
    const isValidConfirmPassword =
      confirmNewPassword.trim() !== "" && confirmNewPassword === newPassword;

    setValid({
      password: isValidPassword,
      newPassword: isValidNewPassword,
      confirmNewPassword: isValidConfirmPassword,
    });

    if (isValidPassword && isValidNewPassword && isValidConfirmPassword) {
      setIsDialogOpen(true);
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsDialogOpen(false);
      const response = await axios.put(
        `https://blog-post-project-api-with-db.vercel.app/auth/reset-password`,
        { oldPassword: password, newPassword }
      );

      if (response.status === 200) {
        toast.success("Success!", { description: "Password reset successful." });
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error.response?.data?.error || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen md:p-8">
      <div className="max-w-4xl w-full md:mx-auto overflow-hidden">
        {/* ===== Desktop Header (รูปเท่าหน้าโปรไฟล์: 56px) ===== */}
        <div className="hidden md:flex items-center p-6">
          <CircleAvatar
            src={avatarUrl}
            alt={displayName}
            size={56}           
            focusY={35}             
            className="mr-4"
            fallback={<span className="text-sm font-semibold">{initials}</span>}
          />
          <div>
            <h1 className="text-2xl font-bold">{displayName || "Reset password"}</h1>
          </div>
        </div>

        {/* ===== Mobile Header ===== */}
        <div className="md:hidden p-4">
          <div className="flex justify-start gap-12 items-center mb-4">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <User className="h-5 w-5 mb-1" />
              Profile
            </button>
            <div className="flex items-center space-x-2 text-foreground font-medium cursor-default">
              <Lock className="h-5 w-5 mb-1" />
              <span>Reset password</span>
            </div>
          </div>
          <div className="flex items-center">
            <CircleAvatar
              src={avatarUrl}
              alt={displayName}
              size={40}            
              focusY={35}
              fallback={<span className="text-[10px] font-semibold">{initials}</span>}
            />
            <h2 className="ml-3 text-xl font-semibold">{displayName}</h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* ===== Desktop Sidebar ===== */}
          <aside className="hidden md:block w-64 p-6">
            <nav>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <User className="h-5 w-5 mb-1" />
                  Profile
                </button>
                <div className="flex items-center space-x-2 text-foreground font-medium cursor-default">
                  <Lock className="h-5 w-5 mb-1" />
                  <span>Reset password</span>
                </div>
              </div>
            </nav>
          </aside>

          {/* ===== Main Content ===== */}
          <main className="flex-1 p-8 bg-[#EFEEEB] md:m-2 md:shadow-md md:rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-7 max-w-3xl">
              <div className="relative">
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.password ? "border-red-500" : ""
                  }`}
                />
                {!valid.password && (
                  <p className="text-red-500 text-xs absolute mt-1">This field is required</p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.newPassword ? "border-red-500" : ""
                  }`}
                />
                {!valid.newPassword && (
                  <p className="text-red-500 text-xs absolute mt-1">
                    Password must be at least 8 characters
                  </p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.confirmNewPassword ? "border-red-500" : ""
                  }`}
                />
                {!valid.confirmNewPassword && (
                  <p className="text-red-500 text-xs absolute mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="px-8 py-2 bg-foreground text-white rounded-full hover:bg-muted-foreground transition-colors"
              >
                Reset password
              </button>
            </form>
          </main>
        </div>
      </div>

      {/* ===== Confirm Modal ===== */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-white rounded-md pt-16 pb-6 max-w-[22rem] sm:max-w-md flex flex-col items-center">
          <AlertDialogTitle className="text-3xl font-semibold pb-2 text-center">
            Reset password
          </AlertDialogTitle>
          <AlertDialogDescription className="flex flex-row mb-2 justify-center font-medium text-center text-muted-foreground">
            Do you want to reset your password?
          </AlertDialogDescription>
          <div className="flex flex-row gap-4">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="bg-background px-10 py-4 rounded-full text-foreground border border-foreground hover:border-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              className="rounded-full text-white bg-foreground hover:bg-muted-foreground transition-colors py-4 text-lg px-10"
            >
              Reset
            </button>
          </div>
          <AlertDialogCancel className="absolute right-4 top-2 sm:top-4 p-1 border-none">
            <X className="h-6 w-6" />
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}