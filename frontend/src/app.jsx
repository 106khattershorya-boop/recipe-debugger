import { Route, Routes } from "react-router";
import SiteFooter from "@/components/layout/SiteFooter.jsx";
import SiteNavbar from "@/components/layout/SiteNavbar.jsx";
import AboutPage from "@/pages/AboutPage.jsx";
import DebuggerPage from "@/pages/DebuggerPage.jsx";
import ExploreRecipesPage from "@/pages/ExploreRecipesPage.jsx";
import HomePage from "@/pages/Homepage.jsx";
import HowItWorksPage from "@/pages/HowItWorksPage.jsx";
import RecipeDetailsPage from "@/pages/RecipeDetailsPage.jsx";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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