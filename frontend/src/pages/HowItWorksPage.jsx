import { Link } from "react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Beaker,
  GitBranch,
  SearchCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

const stages = [
  {
    number: "01",
    icon: SearchCheck,
    title: "Tell us what happened",
    description:
      "Share the recipe, ingredient amounts, steps, and the result you got. If an amount is missing, we leave it unknown instead of guessing.",
    label: "Your recipe and result",
  },
  {
    number: "02",
    icon: Beaker,
    title: "Find ingredient matches",
    description:
      "We look for matching ingredient records in RecipeDB and FlavorDB. A match helps identify an ingredient; it doesn’t tell us whether a dish will taste good.",
    label: "RecipeDB + FlavorDB",
  },
  {
    number: "03",
    icon: GitBranch,
    title: "Look for useful clues",
    description:
      "We compare recipe amounts with the cooking checks available for that recipe type. Some checks are early guides still being evaluated, so a match is a clue—not proof.",
    label: "Recipe checks",
  },
  {
    number: "04",
    icon: SlidersHorizontal,
    title: "Try a change on paper",
    description:
      "Change a measured amount to see how the recipe proportions and checks change. You can save that idea to try later, but we can’t promise how it will turn out.",
    label: "Compare and save an idea",
  },
];

function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#f4f0e7]">
      <section className="border-b border-[#244b3b]/10 bg-[#eae5d9]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              How FlavoLens works
            </p>
            <h1 className="mt-4 font-editorial text-5xl leading-[1.08] tracking-[-0.04em] text-[#292c27] sm:text-6xl">
              From kitchen frustration to a thoughtful next step.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#65685f]">
              Bring a recipe and tell us how it turned out. FlavoLens helps you
              look through the details and consider what to try next—without
              pretending it can taste the food for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-full px-6 normal-case tracking-normal"
              >
                <Link to="/debugger">
                  Check my recipe
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full px-6 normal-case tracking-normal"
              >
                <Link to="/about">About FlavoLens</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div className="max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6c4d]">
              The process
            </p>
            <h2 className="mt-3 font-editorial text-4xl leading-tight tracking-[-0.035em] text-[#292c27]">
              See what we looked at—and what we still don’t know.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#65685f]">
              Your report separates what you told us from the ingredient
              matches and cooking checks. That makes it easier to judge each
              clue for yourself.
            </p>

            <div className="mt-8 rounded-2xl border border-[#244b3b]/10 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#eae5d9] text-primary">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#292c27]">
                    Our promise
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#71736a]">
                    A possible explanation is a starting point, not a verdict.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <motion.article
                  key={stage.number}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="grid gap-4 rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:grid-cols-[auto_1fr] sm:gap-5 sm:p-7"
                >
                  <div className="flex items-start gap-3 sm:block">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f4f0e7] text-primary">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="pt-2 font-editorial text-sm text-[#8a6c4d] sm:mt-4 sm:block">
                      {stage.number}
                    </span>
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8a6c4d]">
                      {stage.label}
                    </p>
                    <h3 className="mt-1 font-editorial text-2xl text-[#292c27]">
                      {stage.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#65685f]">
                      {stage.description}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#244b3b]/10 bg-[#eae5d9]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 lg:px-12 lg:py-20">
          <article className="rounded-2xl border border-[#244b3b]/10 bg-white p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              What you’ll see
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[#65685f]">
              <li>Ingredient amounts we could read from your recipe.</li>
              <li>Ingredient matches from RecipeDB and FlavorDB.</li>
              <li>Which available cooking checks matched your recipe.</li>
              <li>How a changed amount affects the recipe proportions.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#d99b65]/30 bg-[#fff9f1] p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#87572f]">
              What we can’t promise
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[#806c57]">
              <li>A clue is not proof of what caused the problem.</li>
              <li>An ingredient match doesn’t guarantee a good flavor pairing.</li>
              <li>A number comparison can’t predict taste, texture, or rise.</li>
              <li>A saved idea hasn’t been tested in a real kitchen.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

export default HowItWorksPage;