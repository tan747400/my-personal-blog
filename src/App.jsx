import './App.css'
import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";

export default function App() {
  return (
    <div className="min-h-dvh bg-white text-stone-900">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <NavBar />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-14">
        <HeroSection />
      </main>
    </div>
  );
}
