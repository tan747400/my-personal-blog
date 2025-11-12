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
import supabase from "@/lib/db";
import CircleAvatar from "@/components/CircleAvatar";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { state } = useAuth();

  // user info
  const u = state.user;
  const email =
    u?.email || u?.user_metadata?.email || u?.user_metadata?.preferred_email || "";
  const avatarUrl =
    u?.user_metadata?.profile_pic || u?.user_metadata?.avatar_url || "";
  const displayName =
    u?.user_metadata?.name ||
    u?.user_metadata?.username ||
    (u?.email ? u.email.split("@")[0] : "") ||
    "Account";
  const initials =
    (displayName?.match(/[A-Za-zก-ฮ0-9]/g) || []).slice(0, 2).join("").toUpperCase() || "U";

  // form states
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // validity flags + error messages per field
  const [valid, setValid] = useState({
    password: true,
    newPassword: true,
    confirmNewPassword: true,
  });
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");
  const [newPasswordErrorMsg, setNewPasswordErrorMsg] = useState("");
  const [confirmErrorMsg, setConfirmErrorMsg] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ตรวจฟอร์ม + verify current password กับ Supabase ก่อนเปิด popup
  const handleSubmit = async (e) => {
    e.preventDefault();

    // clear messages
    setPasswordErrorMsg("");
    setNewPasswordErrorMsg("");
    setConfirmErrorMsg("");

    // base validations (required)
    const hasPassword = password.trim() !== "";
    const hasNewPassword = newPassword.trim() !== "";
    const hasConfirm = confirmNewPassword.trim() !== "";

    if (!hasPassword) setPasswordErrorMsg("Current password is required.");
    if (!hasNewPassword) setNewPasswordErrorMsg("New password is required.");
    if (!hasConfirm) setConfirmErrorMsg("Confirm new password is required.");

    // extra rules
    const isLengthOk = hasNewPassword && newPassword.length >= 8;
    const isConfirmMatch = hasConfirm && confirmNewPassword === newPassword;

    // ห้ามตั้งซ้ำกับ current
    const isDifferentFromCurrent =
      hasPassword && hasNewPassword ? newPassword !== password : true;
    if (hasNewPassword && !isDifferentFromCurrent) {
      setNewPasswordErrorMsg("New password must be different from current password.");
    }

    setValid({
      password: hasPassword,
      newPassword: isLengthOk && isDifferentFromCurrent,
      confirmNewPassword: isConfirmMatch,
    });

    if (!hasPassword || !isLengthOk || !isConfirmMatch || !isDifferentFromCurrent) return;

    if (!email) {
      toast.error("Cannot verify current password", {
        description: "Your account email is missing.",
      });
      return;
    }

    try {
      setVerifying(true);

      // verify current password
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        const isCredErr =
          error.status === 400 ||
          error.status === 401 ||
          msg.includes("invalid login credentials") ||
          msg.includes("invalid credentials");

        setValid((v) => ({ ...v, password: false }));
        setPasswordErrorMsg(
          isCredErr ? "Incorrect current password" : "Unable to verify. Please try again."
        );
        return;
      }

      // ผ่าน -> เปิดยืนยัน
      setIsDialogOpen(true);
    } catch (err) {
      setValid((v) => ({ ...v, password: false }));
      setPasswordErrorMsg("Unable to verify. Please try again.");
      toast.error("Network error", { description: "Please try again later." });
    } finally {
      setVerifying(false);
    }
  };

  // รีเซ็ตรหัสผ่านด้วย Supabase
  const handleResetPassword = async () => {
    if (submitting) return;

    // กันเคส new == current อีกรอบ
    if (newPassword === password) {
      setValid((v) => ({ ...v, newPassword: false }));
      setNewPasswordErrorMsg("New password must be different from current password.");
      return;
    }

    try {
      setSubmitting(true);
      setIsDialogOpen(false);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("Error", { description: error.message || "Update failed." });
        return;
      }

      toast.success("Success!", { description: "Password reset successful." });
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      toast.error("Error", { description: e?.message || "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen md:p-8">
      <div className="max-w-4xl w-full md:mx-auto overflow-hidden">
        {/* ===== Desktop header: แสดงรูป + ชื่อผู้ใช้ ===== */}
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
            <h1 className="text-2xl font-bold">{displayName}</h1>
          </div>
        </div>

        {/* ===== Mobile header (มีชื่ออยู่แล้ว) ===== */}
        <div className="md:hidden p-4">
          <div className="flex justify-start gap-12 items-center mb-4">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
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
          {/* Sidebar */}
          <aside className="hidden md:block w-64 p-6">
            <nav>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
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

          {/* Main */}
          <main className="flex-1 p-8 bg-[#EFEEEB] md:m-2 md:shadow-md md:rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-7 max-w-3xl">
              {/* current password */}
              <div className="relative">
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Current password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setValid((v) => ({ ...v, password: true }));
                    setPasswordErrorMsg("");
                  }}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.password ? "border-red-500" : ""
                  }`}
                />
                {!valid.password && (
                  <p className="text-red-500 text-xs absolute mt-1">
                    {passwordErrorMsg || "Current password is required."}
                  </p>
                )}
              </div>

              {/* new password */}
              <div className="relative">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setValid((v) => ({ ...v, newPassword: true }));
                    setNewPasswordErrorMsg("");
                  }}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.newPassword ? "border-red-500" : ""
                  }`}
                />
                {!valid.newPassword && (
                  <p className="text-red-500 text-xs absolute mt-1">
                    {newPassword.trim() === ""
                      ? "New password is required."
                      : newPassword === password
                      ? "New password must be different from current password."
                      : "Password must be at least 8 characters"}
                  </p>
                )}
              </div>

              {/* confirm new password */}
              <div className="relative">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    setValid((v) => ({ ...v, confirmNewPassword: true }));
                    setConfirmErrorMsg("");
                  }}
                  className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                    !valid.confirmNewPassword ? "border-red-500" : ""
                  }`}
                />
                {!valid.confirmNewPassword && (
                  <p className="text-red-500 text-xs absolute mt-1">
                    {confirmNewPassword.trim() === ""
                      ? "Confirm new password is required."
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="px-8 py-2 bg-foreground text-white rounded-full hover:bg-muted-foreground transition-colors cursor-pointer disabled:opacity-60"
              >
                {verifying ? "Verifying..." : "Reset password"}
              </button>
            </form>
          </main>
        </div>
      </div>

      {/* Confirm modal */}
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
              className="cursor-pointer bg-background px-10 py-4 rounded-full text-foreground border border-foreground hover:border-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={submitting}
              className="cursor-pointer rounded-full text-white bg-foreground hover:bg-muted-foreground transition-colors py-4 text-lg px-10 disabled:opacity-60"
            >
              {submitting ? "Processing..." : "Reset"}
            </button>
          </div>
          <AlertDialogCancel className="cursor-pointer absolute right-4 top-2 sm:top-4 p-1 border-none">
            <X className="h-6 w-6" />
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}