import { useState } from "react";
import supabase from "@/lib/db";
import { AdminSidebar } from "@/components/AdminWebSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function AdminResetPasswordPage() {
  // form
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // validation flags & messages
  const [valid, setValid] = useState({
    password: true,
    newPassword: true,
    confirmNewPassword: true,
  });
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");
  const [newPasswordErrorMsg, setNewPasswordErrorMsg] = useState("");
  const [confirmErrorMsg, setConfirmErrorMsg] = useState("");

  // dialog + loading
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ตรวจฟอร์มและ verify current password
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    // reset messages
    setPasswordErrorMsg("");
    setNewPasswordErrorMsg("");
    setConfirmErrorMsg("");

    const hasCurrent = password.trim() !== "";
    const hasNew = newPassword.trim() !== "";
    const hasConfirm = confirmNewPassword.trim() !== "";

    // required messages
    if (!hasCurrent) setPasswordErrorMsg("Current password is required.");
    if (!hasNew) setNewPasswordErrorMsg("New password is required.");
    if (!hasConfirm) setConfirmErrorMsg("Confirm new password is required.");

    // rules
    const lengthOK = hasNew && newPassword.length >= 8;
    const sameAsCurrent = hasCurrent && hasNew && newPassword === password; // <-- กันซ้ำ
    if (hasNew && !lengthOK) {
      setNewPasswordErrorMsg("Password must be at least 8 characters");
    }
    if (hasNew && lengthOK && sameAsCurrent) {
      setNewPasswordErrorMsg("New password must be different from current password.");
    }
    const confirmOK = hasConfirm && confirmNewPassword === newPassword;

    setValid({
      password: hasCurrent,
      newPassword: hasNew && lengthOK && !sameAsCurrent,
      confirmNewPassword: confirmOK,
    });

    // ไม่ผ่านหยุดก่อน
    if (!hasCurrent || !hasNew || !lengthOK || sameAsCurrent || !confirmOK) return;

    try {
      setVerifying(true);

      const { data: auth, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const email =
        auth?.user?.email ||
        auth?.user?.user_metadata?.email ||
        auth?.user?.user_metadata?.preferred_email ||
        "";

      if (!email) {
        toast.error("Cannot verify current password", {
          description: "Your account email is missing.",
        });
        return;
      }

      // ✅ verify current password
      const { error } = await supabase.auth.signInWithPassword({ email, password });

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

      // ผ่าน → เปิด popup
      setIsDialogOpen(true);
    } catch (e) {
      setValid((v) => ({ ...v, password: false }));
      setPasswordErrorMsg("Unable to verify. Please try again.");
      toast.error("Network error", { description: "Please try again later." });
    } finally {
      setVerifying(false);
    }
  };

  // ยืนยัน reset password
  const handleResetPassword = async () => {
    if (submitting) return;

    // กันพลาดอีกชั้น: new == current
    if (newPassword === password) {
      setValid((v) => ({ ...v, newPassword: false }));
      setNewPasswordErrorMsg("New password must be different from current password.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error("Error", { description: error.message || "Update failed." });
        return;
      }

      toast.success("Success!", {
        description: "Password reset successful.",
      });

      setIsDialogOpen(false);
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      toast.error("Error", { description: e?.message || "Reset password failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />

      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Reset Password</h2>
          <Button
            className="px-8 py-2 rounded-full cursor-pointer"
            onClick={handleSubmit}
            disabled={verifying}
          >
            {verifying ? "Verifying..." : "Reset Password"}
          </Button>
        </div>

        <form className="space-y-7 max-w-md" onSubmit={handleSubmit}>
          {/* Current password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <Input
              type="password"
              placeholder="Current password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setValid((v) => ({ ...v, password: true }));
                setPasswordErrorMsg("");
              }}
              className={`mt-1 py-3 ${!valid.password ? "border-red-500" : ""}`}
            />
            {!valid.password && (
              <p className="text-red-500 text-xs absolute mt-1">{passwordErrorMsg}</p>
            )}
          </div>

          {/* New password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <Input
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setValid((v) => ({ ...v, newPassword: true }));
                setNewPasswordErrorMsg("");
              }}
              className={`mt-1 py-3 ${!valid.newPassword ? "border-red-500" : ""}`}
            />
            {!valid.newPassword && (
              <p className="text-red-500 text-xs absolute mt-1">
                {newPasswordErrorMsg ||
                  (newPassword.trim() === ""
                    ? "New password is required."
                    : newPassword.length < 8
                    ? "Password must be at least 8 characters"
                    : newPassword === password
                    ? "New password must be different from current password."
                    : "Invalid new password")}
              </p>
            )}
          </div>

          {/* Confirm new password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                setValid((v) => ({ ...v, confirmNewPassword: true }));
                setConfirmErrorMsg("");
              }}
              className={`mt-1 py-3 ${!valid.confirmNewPassword ? "border-red-500" : ""}`}
            />
            {!valid.confirmNewPassword && (
              <p className="text-red-500 text-xs absolute mt-1">
                {confirmErrorMsg ||
                  (confirmNewPassword.trim() === ""
                    ? "Confirm new password is required."
                    : "Passwords do not match")}
              </p>
            )}
          </div>
        </form>
      </main>

      {/* Popup */}
      <ResetPasswordModal
        dialogState={isDialogOpen}
        setDialogState={setIsDialogOpen}
        resetFunction={handleResetPassword}
        submitting={submitting}
      />
    </div>
  );
}

function ResetPasswordModal({ dialogState, setDialogState, resetFunction, submitting }) {
  return (
    <AlertDialog open={dialogState} onOpenChange={setDialogState}>
      <AlertDialogContent className="bg-white rounded-md pt-16 pb-6 max-w-[22rem] sm:max-w-md flex flex-col items-center">
        <AlertDialogTitle className="text-3xl font-semibold pb-2 text-center">
          Reset password
        </AlertDialogTitle>
        <AlertDialogDescription className="flex flex-row mb-2 justify-center font-medium text-center text-muted-foreground">
          Do you want to reset your password?
        </AlertDialogDescription>
        <div className="flex flex-row gap-4">
          <button
            onClick={() => setDialogState(false)}
            className="cursor-pointer bg-background px-10 py-4 rounded-full text-foreground border border-foreground hover:border-muted-foreground hover:text-muted-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={resetFunction}
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
  );
}