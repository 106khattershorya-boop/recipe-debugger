import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import BrandMark from "@/components/branding/BrandMark.jsx";

function SiteFooter() {
  return (
    <footer className="bg-[#203f33] text-[#f4f0e7]">
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-12 border-b border-white/15 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link to="/" aria-label="FlavoLens home">
              <BrandMark inverse />
            </Link>
            <p className="mt-5 text-sm leading-6 text-white/65">
              A thoughtful way to understand what may have happened in your
              kitchen—and what to try next.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
              Discover
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li><Link className="hover:text-white" to="/explore">Explore recipes</Link></li>
              <li><Link className="hover:text-white" to="/#how-it-works">How it works</Link></li>
              <li><Link className="hover:text-white" to="/about">About FlavoLens</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
              The debugger
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li><Link className="hover:text-white" to="/debugger">Analyze a recipe</Link></li>
              <li><Link className="hover:text-white" to="/about">Evidence and sources</Link></li>
              <li><Link className="hover:text-white" to="/about">Our approach</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
              Keep exploring
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Bring a recipe, an observation, and a little curiosity.
            </p>
            <Link
              to="/debugger"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#e6bd96] hover:text-white"
            >
              Try the debugger
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FlavoLens</p>
          <p>RecipeDB · FlavorDB · Clear evidence, careful claims</p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;