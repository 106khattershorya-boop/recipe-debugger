import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import RecipeCard from "@/components/recipes/RecipeCard.jsx";
import { recipes } from "@/data/recipes.js";

const cuisines = [
  "All",
  "Mediterranean",
  "Italian",
  "Japanese-inspired",
  "Indian-inspired",
  "Mexican-inspired",
];

function ExploreRecipesPage() {
  const [searchText, setSearchText] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesCuisine =
        selectedCuisine === "All" || recipe.cuisine === selectedCuisine;

      const searchableText = [
        recipe.title,
        recipe.cuisine,
        recipe.description,
        ...recipe.ingredients.map((ingredient) => ingredient.name),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCuisine && searchableText.includes(normalizedQuery);
    });
  }, [searchText, selectedCuisine]);

  function clearFilters() {
    setSearchText("");
    setSelectedCuisine("All");
  }

  return (
    <main className="min-h-[70vh]">
      <section className="border-b border-[#244b3b]/10 bg-[#eae5d9]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              The recipe collection
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl leading-[1.04] tracking-[-0.05em] text-[#292c27] sm:text-6xl">
              Find your next kitchen experiment.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#65685f] sm:text-base">
              Browse our example dishes by cuisine or ingredient. Pick one to
              see the recipe and try it in the debugger.
            </p>
          </motion.div>

          <div className="mt-9 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[#244b3b]/15 bg-white px-4 focus-within:ring-2 focus-within:ring-primary/20">
              <Search size={17} aria-hidden="true" className="text-[#85867f]" />
              <span className="sr-only">Search recipes or ingredients</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search dishes, cuisines, or ingredients"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#292c27] outline-none placeholder:text-[#99978f]"
              />
              {searchText && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchText("")}
                  className="text-[#777970] hover:text-primary"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="flex items-center gap-2 text-xs text-[#777970]">
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>{filteredRecipes.length} recipes</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {cuisines.map((cuisine) => {
              const active = selectedCuisine === cuisine;

              return (
                <button
                  key={cuisine}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-[#244b3b]/15 bg-white/60 text-[#4d554d] hover:border-primary hover:text-primary"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        {filteredRecipes.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#244b3b]/20 bg-white/60 px-6 py-16 text-center">
            <p className="font-editorial text-2xl text-[#292c27]">
              No recipes match that search.
            </p>
            <p className="mt-2 text-sm text-[#71736a]">
              Try another ingredient or clear your filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default ExploreRecipesPage;