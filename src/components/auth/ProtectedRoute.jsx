import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  isLoading,
  isAuthenticated,
  userRole,      // ส่ง state.user?.user_metadata?.role เข้ามา
  requiredRole,  // e.g. "admin"
  children,
}) {
  if (isLoading) return children; // หรือ spinner ก็ได้
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && userRole !== requiredRole) return <Navigate to="/" replace />;
  return children;
}