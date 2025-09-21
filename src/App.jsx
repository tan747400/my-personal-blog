import "./App.css";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { NavBar, Footer } from "./components/SiteSections";
import { Toaster } from "sonner";

import Home from "./pages/Home";
import PostPage from "./pages/PostPage";
import NotFound from "./pages/NotFound";
import AdminArticleManagementPage from "./pages/admin/AdminArticlePage";
import AdminLogin from "./pages/admin/AdminLoginPage";
import AdminCategoryManagementPage from "./pages/admin/AdminCategoryPage";
import AdminCreateArticlePage from "./pages/admin/AdminCreateArticlePage";
import AdminEditArticlePage from "./pages/admin/AdminEditArticlePage";
import AdminCreateCategoryPage from "./pages/admin/AdminCreateCategoryPage";
import AdminEditCategoryPage from "./pages/admin/AdminEditCategoryPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminNotificationPage from "./pages/admin/AdminNotificationPage";
import AdminResetPasswordPage from "./pages/admin/AdminResetPasswordPage";

function Layout() {
  return (
    <div>
      <header><NavBar /></header>
      <main><Outlet /></main>
      <footer><Footer /></footer>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public site under Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/article-management" element={<AdminArticleManagementPage />} />
        <Route path="/admin/article-management/create" element={<AdminCreateArticlePage />} />
        <Route path="/admin/article-management/edit/:postId" element={<AdminEditArticlePage />} />
        <Route path="/admin/category-management" element={<AdminCategoryManagementPage />} />
        <Route path="/admin/category-management/create" element={<AdminCreateCategoryPage />} />
        <Route path="/admin/category-management/edit/:categoryId" element={<AdminEditCategoryPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="/admin/notification" element={<AdminNotificationPage />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />

      </Routes>

      <Toaster richColors closeButton />
    </>
  );
}