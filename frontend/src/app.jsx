import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import SiteFooter from "@/components/layout/SiteFooter.jsx";
import SiteNavbar from "@/components/layout/SiteNavbar.jsx";
import AboutPage from "@/pages/AboutPage.jsx";
import DebuggerPage from "@/pages/DebuggerPage.jsx";
import ExploreRecipesPage from "@/pages/ExploreRecipesPage.jsx";
import HomePage from "@/pages/Homepage.jsx";
import HowItWorksPage from "@/pages/HowItWorksPage.jsx";
import RecipeDetailsPage from "@/pages/RecipeDetailsPage.jsx";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(
        decodeURIComponent(hash.slice(1)),
      );

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <SiteNavbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExploreRecipesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/recipes/:recipeId" element={<RecipeDetailsPage />} />
        <Route path="/debugger" element={<DebuggerPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <SiteFooter />
    </div>
  );
}

export default App;