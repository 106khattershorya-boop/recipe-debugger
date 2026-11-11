import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";

const principles = [
  {
    icon: MessageSquareText,
    title: "Your experience comes first",
    description:
      "The result you report stays separate from the clues the recipe checks may find.",
  },
  {
    icon: BookOpenCheck,
    title: "You can see the clues",
    description:
      "We show which amounts and recipe details were checked, so you can decide what seems relevant.",
  },
  {
    icon: ShieldCheck,
    title: "We’re honest about uncertainty",
    description:
      "Some cooking guides are still being evaluated. A match is something to investigate, not a confirmed cause.",
  },
];

function AboutPage() {
  return (
    <main>
      <section className="bg-[#eae5d9]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              About FlavoLens
            </p>
            <h1 className="mt-4 text-5xl leading-[1.04] tracking-[-0.05em] text-[#292c27] sm:text-7xl">
              Better questions for the moments a recipe goes wrong.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#65685f]">
              FlavoLens helps you look at the ingredients, amounts, and steps
              together, then consider a change you could try next time.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Why we made it
            </p>
            <h2 className="mt-3 max-w-lg text-4xl leading-tight tracking-[-0.04em] text-[#292c27] sm:text-5xl">
              Cooking has many variables. It helps to know where to look first.
            </h2>
          </div>

          <div className="space-y-5 text-sm leading-7 text-[#65685f]">
            <p>
              A recipe is more than a list of ingredients. Amounts and steps
              work together, and even a small difference can change the result.
              When dinner doesn’t turn out as expected, it can be hard to know
              what to check.
            </p>
            <p>
              FlavoLens helps organize the details you share and points out
              possible clues from the recipe checks available today. It shows
              what matched and what information was missing.
            </p>
            <p>
              You can also try a different measured amount and compare the
              recipe proportions. That comparison is a way to explore an idea;
              it isn’t a promise about how the next dish will taste.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#244b3b]/10 bg-white/55">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              What matters to us
            </p>
            <h2 className="mt-3 text-4xl tracking-[-0.04em] text-[#292c27] sm:text-5xl">
              Helpful, clear, and honest about its limits.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map((principle, index) => {
              const Icon = principle.icon;

              return (
                <motion.article
                  key={principle.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                  className="rounded-2xl border border-[#244b3b]/10 bg-white p-6"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-[#eae5d9] text-primary">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 font-editorial text-2xl text-[#292c27]">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#71736a]">
                    {principle.description}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Ingredient references
            </p>
            <h2 className="mt-3 font-editorial text-4xl text-[#292c27]">
              Food databases help us identify ingredients.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#71736a]">
              FlavoLens connects recipe ingredients with matching records in
              RecipeDB and FlavorDB. These sources add context, but a database
              match alone can’t explain why a dish turned out a certain way.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#244b3b]/10 bg-white p-5">
              <Database size={20} aria-hidden="true" className="text-primary" />
              <h3 className="mt-4 font-editorial text-2xl text-[#292c27]">
                RecipeDB
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#71736a]">
                Recipe and ingredient records help us look up ingredients in
                your recipe.
              </p>
            </article>

            <article className="rounded-2xl border border-[#244b3b]/10 bg-white p-5">
              <BookOpenCheck
                size={20}
                aria-hidden="true"
                className="text-primary"
              />
              <h3 className="mt-4 font-editorial text-2xl text-[#292c27]">
                FlavorDB
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#71736a]">
                Linked ingredient records give us another way to identify what
                is in a recipe.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-primary">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 px-5 py-12 text-white sm:px-8 md:flex-row md:items-center lg:px-12">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Start with what you noticed
            </p>
            <h2 className="mt-2 font-editorial text-3xl sm:text-4xl">
              Bring a recipe. Follow the clues.
            </h2>
          </div>
          <Link
            to="/debugger"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f0e7] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-white"
          >
            Check my recipe
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;