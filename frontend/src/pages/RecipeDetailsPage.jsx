import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock3,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { recipes } from "@/data/recipes.js";

function RecipeDetailsPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const recipe = recipes.find((item) => item.slug === recipeId);
  const [saved, setSaved] = useState(false);

  if (!recipe) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Recipe not found
        </p>
        <h1 className="mt-4 font-editorial text-4xl text-[#292c27]">
          Let’s find another dish.
        </h1>
        <Button asChild className="mt-7 rounded-full normal-case tracking-normal">
          <Link to="/explore">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to recipes
          </Link>
        </Button>
      </main>
    );
  }

  function openDebugger() {
    navigate("/debugger", { state: { recipe } });
  }

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#64685f] hover:text-primary"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to Explore
      </Link>

      <div className="mt-7 grid gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#e6dfd2]">
          <img
            src={recipe.image}
            alt={recipe.imageAlt}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-[350px] w-full object-cover sm:h-[500px]"
          />
          <span className="absolute left-5 top-5 rounded-full bg-[#f4f0e7]/95 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
            Sample recipe
          </span>
        </div>

        <div className="py-1 lg:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6c4d]">
            {recipe.cuisine}
          </p>
          <h1 className="mt-3 max-w-2xl text-5xl leading-[1.04] tracking-[-0.05em] text-[#292c27] sm:text-6xl">
            {recipe.title}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#65685f] sm:text-base">
            {recipe.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 border-y border-[#244b3b]/10 py-4 text-xs text-[#62665d]">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} aria-hidden="true" className="text-primary" />
              {recipe.timeMinutes} minutes
            </span>
            <span className="inline-flex items-center gap-2">
              <UsersRound size={15} aria-hidden="true" className="text-primary" />
              Serves {recipe.servings}
            </span>
            <span>{recipe.difficulty}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={openDebugger}
              className="rounded-full px-5 normal-case tracking-normal"
            >
              Try debugging this recipe
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaved((value) => !value)}
              className="rounded-full px-5 normal-case tracking-normal"
            >
              {saved ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Bookmark size={16} aria-hidden="true" />
              )}
              {saved ? "Saved for later" : "Save recipe"}
            </Button>
          </div>

          <p className="mt-3 text-[11px] text-[#85867f]">
            Saving is a local preview interaction; it doesn’t create an account
            or store data.
          </p>
        </div>
      </div>

      <div className="mt-14 grid gap-10 border-t border-[#244b3b]/10 pt-10 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Gather your ingredients
          </p>
          <h2 className="mt-3 font-editorial text-3xl text-[#292c27]">
            For {recipe.servings}
          </h2>

          <ul className="mt-6 divide-y divide-[#244b3b]/10 rounded-2xl border border-[#244b3b]/10 bg-white px-5">
            {recipe.ingredients.map((ingredient) => (
              <li
                key={`${ingredient.amount}-${ingredient.name}`}
                className="flex gap-4 py-3.5 text-sm"
              >
                <span className="w-20 shrink-0 font-medium text-primary">
                  {ingredient.amount}
                </span>
                <span className="text-[#50554d]">{ingredient.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            The method
          </p>
          <h2 className="mt-3 font-editorial text-3xl text-[#292c27]">
            Follow the steps
          </h2>

          <ol className="mt-6 space-y-3">
            {recipe.steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-[#244b3b]/10 bg-white p-4 sm:p-5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-xs font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 text-sm leading-6 text-[#50554d]">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

export default RecipeDetailsPage;