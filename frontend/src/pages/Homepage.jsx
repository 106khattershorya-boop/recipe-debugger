import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import RecipeCard from "@/components/recipes/RecipeCard.jsx";
import { recipes } from "@/data/recipes.js";

const benefits = [
  {
    title: "Clear explanations",
    body: "See which recipe details may be worth a closer look.",
  },
  {
    title: "Ingredient references",
    body: "Find ingredient records through RecipeDB and FlavorDB.",
  },
  {
    title: "Try a change on paper",
    body: "Compare recipe amounts before trying an idea in your kitchen.",
  },
  {
    title: "Honest about uncertainty",
    body: "Possible clues are starting points, not proven causes.",
  },
];

function Eyebrow({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
      {children}
    </p>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState("");
  const [formMessage, setFormMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!recipeName.trim()) {
      setFormMessage("Enter a recipe name to get started.");
      return;
    }

    navigate("/debugger", {
      state: { initialRecipeName: recipeName.trim() },
    });
  }

  return (
    <main>
      <section
        id="home"
        className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-12 lg:pb-24 lg:pt-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/60 px-3.5 py-2 text-[11px] font-medium tracking-wide text-primary">
            <Sparkles size={14} aria-hidden="true" />
            A thoughtful companion for curious cooks
          </div>

          <h1 className="max-w-[720px] text-[clamp(3.25rem,7vw,6.4rem)] leading-[0.99] tracking-[-0.055em] text-[#292c27]">
            Every recipe has a story.
            <span className="mt-2 block text-primary">Make yours work.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#65685f] sm:text-base">
            Something came out too dense, too dry, or just not quite right?
            Bring the recipe and we’ll help you look for clues, one step at a
            time.
          </p>

          <form
            id="debugger-input"
            onSubmit={handleSubmit}
            className="mt-8 max-w-xl rounded-[1.35rem] border border-[#244b3b]/15 bg-white p-3 shadow-[0_14px_45px_rgba(41,44,39,0.08)]"
          >
            <label htmlFor="recipe-prompt" className="sr-only">
              Recipe name
            </label>
            <input
              id="recipe-prompt"
              value={recipeName}
              onChange={(event) => {
                setRecipeName(event.target.value);
                setFormMessage("");
              }}
              placeholder="What recipe would you like help with?"
              className="h-14 w-full rounded-xl border-0 bg-transparent px-3 text-sm text-[#292c27] outline-none placeholder:text-[#96958d] focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex flex-col gap-3 border-t border-[#244b3b]/10 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="pl-2 text-[11px] text-[#777970]">
                Add ingredients and steps on the next screen
              </span>
              <Button
                type="submit"
                className="rounded-full px-5 normal-case tracking-normal"
              >
                Continue with my recipe
                <ArrowUpRight aria-hidden="true" size={16} />
              </Button>
            </div>
            {formMessage && (
              <p role="alert" className="px-3 pb-2 pt-3 text-xs text-[#8d342a]">
                {formMessage}
              </p>
            )}
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#777970]">
            <span>Sources and uncertainty shown</span>
            <span className="text-[#d99b65]">•</span>
            <span>No camera needed</span>
          </div>

          <Link
            to="/explore"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3"
          >
            Explore sample recipes
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[650px]"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-[#d8d2c4]">
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1600&q=90"
              alt="Fresh ingredients arranged for a home-cooked meal"
              className="h-[390px] w-full object-cover sm:h-[500px] lg:h-[560px]"
              fetchPriority="high"
            />
            <div className="image-fade absolute inset-0" />
            <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
              From the kitchen notebook
            </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 bg-[#f4f0e7]/95 p-4 shadow-lg sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6c4d]">
                A better question
              </p>
              <p className="mt-2 max-w-sm font-editorial text-xl leading-snug text-[#292c27] sm:text-2xl">
                What changed between the recipe and the result?
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-[#244b3b]/10 pt-3 text-[11px] text-[#6f7168]">
                <Search size={14} aria-hidden="true" className="text-primary" />
                Ingredients → steps → what you noticed
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="explore" className="border-y border-[#244b3b]/10 bg-white/45">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <Eyebrow>Cook something lovely</Eyebrow>
              <h2 className="mt-3 text-4xl tracking-[-0.04em] text-[#292c27] sm:text-5xl">
                Recipes worth exploring
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#71736a]">
                A small collection of example recipes to browse and try.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:gap-3 sm:self-auto"
            >
              Browse all recipes
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {recipes.slice(0, 3).map((recipe, index) => (
              <motion.div
                key={recipe.slug}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 max-w-lg text-4xl leading-tight tracking-[-0.04em] text-[#292c27] sm:text-5xl">
              Curiosity is the first ingredient.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#71736a]">
              Turn a cooking frustration into a closer look at the recipe.
            </p>
            <Link
              to="/how-it-works"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              See how it works
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="divide-y divide-[#244b3b]/10 border-y border-[#244b3b]/10">
            {[
              [
                "01",
                "Share your recipe",
                "Add ingredients, amounts, steps, and what you noticed.",
              ],
              [
                "02",
                "Look for clues",
                "See which recipe details and cooking checks may be relevant.",
              ],
              [
                "03",
                "Try an idea",
                "Compare a changed amount before deciding what to try in your kitchen.",
              ],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="grid gap-3 py-6 sm:grid-cols-[64px_1fr] sm:gap-5"
              >
                <span className="font-editorial text-2xl text-[#bd8050]">
                  {number}
                </span>
                <div>
                  <h3 className="font-editorial text-2xl text-[#292c27]">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#71736a]">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#eae5d9]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <Eyebrow>Why FlavoLens</Eyebrow>
            <h2 className="mt-3 text-4xl tracking-[-0.04em] text-[#292c27] sm:text-5xl">
              A thoughtful report, with its limits in view.
            </h2>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-[#244b3b]/10 bg-white/75 p-5"
              >
                <h3 className="font-editorial text-xl text-[#292c27]">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-xs leading-5 text-[#71736a]">
                  {benefit.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-7 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                Ready to take a closer look?
              </p>
              <h3 className="mt-2 max-w-xl font-editorial text-3xl leading-tight sm:text-4xl">
                Your next kitchen experiment starts with a good question.
              </h3>
            </div>
            <Button
              asChild
              variant="secondary"
              className="shrink-0 rounded-full px-5 normal-case tracking-normal"
            >
              <Link to="/debugger">
                Check my recipe
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;