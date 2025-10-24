import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SignUpSuccessPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-[calc(100vh-0px)] items-center justify-center p-4 my-4">
      <div className="flex w-full max-w-xl flex-col items-center rounded-sm bg-[#EFEEEB] px-3 py-14 shadow-md sm:px-20 text-center">
        {/* Success Icon */}
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-md shadow-green-300/50">
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-semibold text-foreground">
          Registration successful
        </h1>
        <p className="mb-8 text-muted-foreground">
          Your account has been created. You can now log in to continue.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="rounded-full bg-foreground px-8 py-3 text-base font-medium text-white transition-colors hover:bg-muted-foreground"
        >
          Continue to login
        </button>
      </div>
    </main>
  );
}