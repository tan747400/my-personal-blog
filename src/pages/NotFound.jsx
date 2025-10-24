import { TriangleAlert } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-4 my-6">
      <div className="flex w-full max-w-xl flex-col items-center space-y-6 rounded-sm bg-[#EFEEEB] px-4 py-12 shadow">
        <TriangleAlert className="h-20 w-20 text-red-500" />
        <h1 className="text-3xl font-extrabold text-stone-800">404 – Page Not Found</h1>
        <p className="text-center text-stone-600">
          We couldn’t find the page you’re looking for.
        </p>

        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-md bg-stone-900 px-6 py-2 text-white transition hover:bg-stone-800"
          >
            Back to Home
          </button>
          <Link
            to="/"
            className="rounded-md border border-stone-300 px-5 py-2 font-medium hover:bg-stone-100"
          >
            Home page
          </Link>
        </div>
      </div>
    </main>
  );
}