import './App.css'
import { NavBar, HeroSection, Footer } from "./components/SiteSections";
import ArticleSection from './components/ArticleSection';

export default function App() {
  return (
    <div>
      <header>
          <NavBar/>
      </header>
      <main >
          <HeroSection />
          <ArticleSection />
      </main>
      <footer>
          <Footer />
      </footer>
    </div>
  );
}
