import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authentication.jsx";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
  const { register, state } = useAuth();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formValues.name.trim()) errors.name = "Name is required.";
    else if (!/^[a-zA-Z\s]+$/.test(formValues.name))
      errors.name = "Name must contain only letters and spaces.";
    else if (formValues.name.length < 3)
      errors.name = "Name must be at least 3 characters long.";

    if (!formValues.username.trim()) errors.username = "Username is required.";
    else if (!/^[a-zA-Z0-9._-]+$/.test(formValues.username))
      errors.username =
        "Username can only contain letters, numbers, dots, underscores, and dashes.";
    else if (formValues.username.length < 5)
      errors.username = "Username must be at least 5 characters long.";
    else if (formValues.username.length > 15)
      errors.username = "Username cannot exceed 15 characters.";

    if (!formValues.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email))
      errors.email = "Please enter a valid email.";

    if (!formValues.password.trim()) errors.password = "Password is required.";
    else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(formValues.password))
      errors.password = "Password must contain letters and numbers.";
    else if (formValues.password.length < 8)
      errors.password = "Password must be at least 8 characters long.";

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await register(formValues);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    navigate("/sign-up/success");
  };

  const handleChange = (key, value) =>
    setFormValues((prev) => ({ ...prev, [key]: value }));

  return (
    <main className="flex justify-center items-center p-4 my-6 flex-grow">
      <div className="w-full max-w-2xl bg-[#EFEEEB] rounded-sm shadow-md px-3 sm:px-20 py-14">
        <h2 className="text-4xl font-semibold text-center mb-6 text-foreground">
          Sign up
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Name
            </label>
            <Input
              id="name"
              placeholder="Full name"
              value={formValues.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                formErrors.name ? "border-red-500" : ""
              }`}
              disabled={state.loading}
            />
            {formErrors.name && (
              <p className="text-red-500 text-xs absolute">{formErrors.name}</p>
            )}
          </div>

          {/* Username */}
          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Username
            </label>
            <Input
              id="username"
              placeholder="Username"
              value={formValues.username}
              onChange={(e) => handleChange("username", e.target.value)}
              className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                formErrors.username ? "border-red-500" : ""
              }`}
              disabled={state.loading}
            />
            {formErrors.username && (
              <p className="text-red-500 text-xs absolute">
                {formErrors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={formValues.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                formErrors.email ? "border-red-500" : ""
              }`}
              disabled={state.loading}
            />
            {formErrors.email && (
              <p className="text-red-500 text-xs absolute">
                {formErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="relative space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={formValues.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className={`mt-1 py-3 rounded-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground ${
                formErrors.password ? "border-red-500" : ""
              }`}
              disabled={state.loading}
            />
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
              Sign up
            </button>
          </div>
        </form>

        <p className="flex flex-row justify-center gap-1 mt-4 text-sm text-center pt-2 text-muted-foreground font-medium">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-foreground hover:text-muted-foreground transition-colors underline font-semibold"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}