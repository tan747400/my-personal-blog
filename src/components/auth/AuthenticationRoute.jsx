import { Navigate } from "react-router-dom";

function Spinner() {
  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="animate-spin size-10 rounded-full border-4 border-stone-300 border-t-stone-600" />
    </div>
  );
}

export default function AuthenticationRoute({ isLoading, isAuthenticated, children }) {
  if (isLoading) return <Spinner />;    // หรือ return children; ถ้าอยากโชว์ฟอร์มทันที
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}