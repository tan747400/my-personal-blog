import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-3xl font-extrabold">404 – Not Found</h1>
      <p className="mt-2 text-stone-600">
        We couldn’t find the page you’re looking for.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full border px-5 py-2 font-medium hover:bg-stone-100"
      >
        Back to Home
      </Link>
    </div>
  );
}