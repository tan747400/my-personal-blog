import "./App.css";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Layout sections
import { NavBar, Footer } from "./components/SiteSections";

// Auth
import AuthenticationRoute from "./components/auth/AuthenticationRoute.jsx";
import { useAuth } from "./contexts/authentication.jsx";

// Admin Gate
import AdminGate from "./components/auth/AdminGate.jsx";

// Public pages
import Home from "./pages/Home.jsx";
import PostPage from "./pages/PostPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import LatestArticles from "./pages/LatestArticles.jsx"; // ✅ เพิ่มใหม่

// User pages
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import SignUpSuccessPage from "./pages/SignUpSuccessPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

// Admin pages
import AdminArticleManagementPage from "./pages/admin/AdminArticlePage.jsx";
import AdminLogin from "./pages/admin/AdminLoginPage.jsx";
import AdminCategoryManagementPage from "./pages/admin/AdminCategoryPage.jsx";
import AdminCreateArticlePage from "./pages/admin/AdminCreateArticlePage.jsx";
import AdminEditArticlePage from "./pages/admin/AdminEditArticlePage.jsx";
import AdminCreateCategoryPage from "./pages/admin/AdminCreateCategoryPage.jsx";
import AdminEditCategoryPage from "./pages/admin/AdminEditCategoryPage.jsx";
import AdminProfilePage from "./pages/admin/AdminProfilePage.jsx";
import AdminNotificationPage from "./pages/admin/AdminNotificationPage.jsx";
import AdminResetPasswordPage from "./pages/admin/AdminResetPasswordPage.jsx";

// Layout wrapper
function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F7]">
      <header>
        <NavBar />
      </header>
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="mt-auto">
        <Footer />
      </footer>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, state } = useAuth();

  return (
    <>
      <Routes>
        {/* Public layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/post/:postId" element={<PostPage />} />

          {/* หน้าใหม่: Latest articles */}
          <Route path="/latest-articles" element={<LatestArticles />} />

          {/* 👤 Guest-only routes */}
          <Route
            path="/login"
            element={
              <AuthenticationRoute
                isLoading={state.getUserLoading}
                isAuthenticated={isAuthenticated}
              >
                <LoginPage />
              </AuthenticationRoute>
            }
          />
          <Route
            path="/sign-up"
            element={
              <AuthenticationRoute
                isLoading={state.getUserLoading}
                isAuthenticated={isAuthenticated}
              >
                <SignUpPage />
              </AuthenticationRoute>
            }
          />

          {/* ✅ Public user routes */}
          <Route path="/sign-up/success" element={<SignUpSuccessPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin login (อยู่นอก Layout public) */}
        <Route
          path="/admin/login"
          element={
            <AuthenticationRoute
              isLoading={state.getUserLoading}
              isAuthenticated={isAuthenticated}
            >
              <AdminLogin />
            </AuthenticationRoute>
          }
        />

        {/* Admin zone — ใช้ AdminGate เช็ค role จาก Supabase */}
        <Route
          path="/admin/article-management"
          element={
            <AdminGate>
              <AdminArticleManagementPage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/article-management/create"
          element={
            <AdminGate>
              <AdminCreateArticlePage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/article-management/edit/:postId"
          element={
            <AdminGate>
              <AdminEditArticlePage />
            </AdminGate>
          }
        />

        <Route
          path="/admin/category-management"
          element={
            <AdminGate>
              <AdminCategoryManagementPage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/category-management/create"
          element={
            <AdminGate>
              <AdminCreateCategoryPage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/category-management/edit/:categoryId"
          element={
            <AdminGate>
              <AdminEditCategoryPage />
            </AdminGate>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <AdminGate>
              <AdminProfilePage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/notification"
          element={
            <AdminGate>
              <AdminNotificationPage />
            </AdminGate>
          }
        />
        <Route
          path="/admin/reset-password"
          element={
            <AdminGate>
              <AdminResetPasswordPage />
            </AdminGate>
          }
        />

        {/* Redirect /admin → /admin/login */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      </Routes>

      <Toaster richColors closeButton />
    </>
  );
}