import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/authentication.jsx";

export default function LoginPage() {
  const { login, state } = useAuth();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = useMemo(
    () => () => {
      const errors = {};
      if (!formValues.email.trim()) errors.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email))
        errors.email = "Please enter a valid email address.";
      if (!formValues.password.trim()) errors.password = "Password is required.";
      return errors;
    },
    [formValues]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await login(formValues);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    navigate("/");
  };

  const handleChange = (key, value) =>
    setFormValues((p) => ({ ...p, [key]: value }));

  return (
    <main className="flex justify-center items-center p-4 my-8 flex-grow">
      <div className="w-full max-w-2xl bg-[#EFEEEB] rounded-sm shadow-md px-3 sm:px-20 py-14">
        <h2 className="text-4xl font-semibold text-center mb-6 text-foreground">
          Log in
        </h2>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formValues.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                formErrors.email ? "border-red-500" : ""
              }`}
              disabled={state.loading}
            />
            {formErrors.email && (
              <p className="text-red-500 text-xs absolute">{formErrors.email}</p>
            )}
          </div>

          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formValues.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`mt-1 py-3 pr-10 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                  formErrors.password ? "border-red-500" : ""
                }`}
                disabled={state.loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-3 grid place-items-center cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-red-500 text-xs absolute">
                {formErrors.password}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="px-8 py-2 bg-foreground text-white rounded-full hover:bg-muted-foreground transition-colors flex items-center gap-1 disabled:opacity-60"
              disabled={state.loading}
            >
              {state.loading && <Loader2 className="animate-spin" size={20} />}
              Log in
            </button>
          </div>
        </form>

        <p className="text-sm text-center mt-4 text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/sign-up"
            className="text-foreground hover:text-muted-foreground transition-colors underline font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}