import "./App.css";
import { Routes, Route, Outlet } from "react-router-dom";
import { NavBar, Footer } from "./components/SiteSections";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import PostPage from "./pages/PostPage";
import NotFound from "./pages/NotFound";

function Layout() {
  return (
    <div>
      <header>
        <NavBar />
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster richColors closeButton />
    </>
  );
}
