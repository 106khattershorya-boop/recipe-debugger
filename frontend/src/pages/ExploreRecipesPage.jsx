import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import RecipeCard from "@/components/recipes/RecipeCard.jsx";
import RecipeDBCard from "@/components/recipes/RecipeDBCard.jsx";
import {
  getRecipeDBRecipes,
  searchRecipeDBRecipesByTitle,
} from "@/lib/api.js";
import { recipes } from "@/data/recipes.js";

const cuisines = [
  "All",
  "Mediterranean",
  "Italian",
  "Japanese-inspired",
  "Indian-inspired",
  "Mexican-inspired",
];

const RECIPE_PAGE_SIZE = 10;

function ExploreRecipesPage() {
  const [activeCollection, setActiveCollection] = useState("recipedb");
  const [searchText, setSearchText] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");

  const [recipeDBPage, setRecipeDBPage] = useState(null);
  const [recipeDBPageNumber, setRecipeDBPageNumber] = useState(1);
  const [recipeDBLoading, setRecipeDBLoading] = useState(true);
  const [recipeDBError, setRecipeDBError] = useState("");
  const [recipeTitleQuery, setRecipeTitleQuery] = useState("");
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [titleSearchResults, setTitleSearchResults] = useState(null);
  const [titleSearchLoading, setTitleSearchLoading] = useState(false);
  const [titleSearchError, setTitleSearchError] = useState("");

  async function loadRecipeDBPage(pageNumber) {
    setRecipeDBLoading(true);
    setRecipeDBError("");

    try {
      const result = await getRecipeDBRecipes(pageNumber, RECIPE_PAGE_SIZE);
      setRecipeDBPage(result);
      setRecipeDBPageNumber(pageNumber);
    } catch (error) {
      setRecipeDBError(
        error.message || "We couldn’t load recipes. Please try again.",
      );
    } finally {
      setRecipeDBLoading(false);
    }
  }

  useEffect(() => {
    loadRecipeDBPage(1);
  }, []);

  async function searchRecipeDBTitle(title = recipeTitleQuery) {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      setTitleSearchError("Enter a recipe title to search.");
      return;
    }

    setSubmittedTitle(cleanedTitle);
    setTitleSearchLoading(true);
    setTitleSearchError("");
    setTitleSearchResults(null);

    try {
      const result = await searchRecipeDBRecipesByTitle(cleanedTitle);
      setTitleSearchResults(
        Array.isArray(result?.recipes) ? result.recipes : [],
      );
    } catch (error) {
      setTitleSearchError(
        error.message || "We couldn’t search RecipeDB. Please try again.",
      );
    } finally {
      setTitleSearchLoading(false);
    }
  }

  function clearRecipeDBTitleSearch() {
    setRecipeTitleQuery("");
    setSubmittedTitle("");
    setTitleSearchResults(null);
    setTitleSearchError("");
  }

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

  const recipeDBRecords = Array.isArray(recipeDBPage?.recipes)
    ? recipeDBPage.recipes
    : [];

  const recipeDBSearchResults = recipeDBRecords.filter((recipe) => {
    const query = searchText.trim().toLowerCase();
    if (!query) return true;

    return [
      recipe.Recipe_title,
      recipe.Region,
      recipe.Sub_region,
      recipe.Continent,
      recipe.Source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const totalRecords = Number(recipeDBPage?.meta?.total);
  const reportedLimit = Number(recipeDBPage?.meta?.limit) || RECIPE_PAGE_SIZE;
  const totalPages =
    Number.isFinite(totalRecords) && totalRecords > 0
      ? Math.ceil(totalRecords / reportedLimit)
      : null;

  function clearFilters() {
    setSearchText("");
    setSelectedCuisine("All");
  }

  function chooseCollection(collection) {
    setActiveCollection(collection);
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
              Browse RecipeDB records or explore the FlavoLens example
              collection.
            </p>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={activeCollection === "recipedb"}
              onClick={() => chooseCollection("recipedb")}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                activeCollection === "recipedb"
                  ? "border-primary bg-primary text-white"
                  : "border-[#244b3b]/15 bg-white/60 text-[#4d554d] hover:border-primary"
              }`}
            >
              RecipeDB
            </button>
            <button
              type="button"
              aria-pressed={activeCollection === "examples"}
              onClick={() => chooseCollection("examples")}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                activeCollection === "examples"
                  ? "border-primary bg-primary text-white"
                  : "border-[#244b3b]/15 bg-white/60 text-[#4d554d] hover:border-primary"
              }`}
            >
              FlavoLens examples
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[#244b3b]/15 bg-white px-4 focus-within:ring-2 focus-within:ring-primary/20">
              <Search size={17} aria-hidden="true" className="text-[#85867f]" />
              <span className="sr-only">Search recipes</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={
                  activeCollection === "recipedb"
                    ? "Search this RecipeDB page"
                    : "Search dishes, cuisines, or ingredients"
                }
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
              <span>
                {activeCollection === "recipedb"
                  ? submittedTitle
                    ? `${titleSearchResults?.length ?? 0} title results`
                    : `${recipeDBSearchResults.length} on this page`
                  : `${filteredRecipes.length} recipes`}
              </span>
            </div>
          </div>

          {activeCollection === "examples" && (
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
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        {activeCollection === "recipedb" ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                searchRecipeDBTitle();
              }}
              className="mb-6 flex flex-col gap-3 sm:flex-row"
            >
              <label className="sr-only" htmlFor="recipedb-title-search">
                Search RecipeDB by title
              </label>
              <input
                id="recipedb-title-search"
                value={recipeTitleQuery}
                onChange={(event) => setRecipeTitleQuery(event.target.value)}
                placeholder="Search RecipeDB by title, e.g. Gulab Jamun"
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#244b3b]/15 bg-white px-4 text-sm text-[#292c27] outline-none placeholder:text-[#99978f] focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={titleSearchLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {titleSearchLoading && (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {titleSearchLoading ? "Searching…" : "Search titles"}
              </button>
              {submittedTitle && (
                <button
                  type="button"
                  onClick={clearRecipeDBTitleSearch}
                  className="h-11 rounded-xl border border-[#244b3b]/15 bg-white px-4 text-xs font-medium text-primary"
                >
                  Browse all
                </button>
              )}
            </form>

            <p className="mb-6 max-w-3xl text-xs leading-5 text-[#71736a]">
              {submittedTitle
                ? `RecipeDB title results for “${submittedTitle}”.`
                : "RecipeDB listings include details such as title, region, cooking time, and calories when available. They may not include the full ingredients or instructions."}
            </p>

            {titleSearchLoading ? (
              <div
                role="status"
                className="flex items-center justify-center gap-3 rounded-2xl border border-[#244b3b]/10 bg-white p-12 text-sm text-[#65685f]"
              >
                <LoaderCircle
                  size={18}
                  className="animate-spin text-primary"
                  aria-hidden="true"
                />
                Searching RecipeDB…
              </div>
            ) : titleSearchError ? (
              <div className="rounded-2xl border border-[#a33c2f]/20 bg-white px-6 py-12 text-center">
                <p className="font-editorial text-2xl text-[#292c27]">
                  We couldn’t search RecipeDB.
                </p>
                <p role="alert" className="mt-2 text-sm text-[#71736a]">
                  {titleSearchError}
                </p>
                {submittedTitle && (
                  <button
                    type="button"
                    onClick={() => searchRecipeDBTitle(submittedTitle)}
                    className="mt-5 text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    Try again
                  </button>
                )}
              </div>
            ) : submittedTitle && titleSearchResults?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#244b3b]/20 bg-white/60 px-6 py-16 text-center">
                <p className="font-editorial text-2xl text-[#292c27]">
                  No RecipeDB titles found.
                </p>
                <p className="mt-2 text-sm text-[#71736a]">
                  Try another title or browse the unfiltered recipe list.
                </p>
              </div>
            ) : !submittedTitle && recipeDBLoading ? (
              <div
                role="status"
                className="flex items-center justify-center gap-3 rounded-2xl border border-[#244b3b]/10 bg-white p-12 text-sm text-[#65685f]"
              >
                <LoaderCircle
                  size={18}
                  className="animate-spin text-primary"
                  aria-hidden="true"
                />
                Loading recipes…
              </div>
            ) : !submittedTitle && recipeDBError ? (
              <div className="rounded-2xl border border-[#a33c2f]/20 bg-white px-6 py-12 text-center">
                <p className="font-editorial text-2xl text-[#292c27]">
                  We couldn’t load RecipeDB recipes.
                </p>
                <p className="mt-2 text-sm text-[#71736a]">{recipeDBError}</p>
                <button
                  type="button"
                  onClick={() => loadRecipeDBPage(recipeDBPageNumber)}
                  className="mt-5 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            ) : (submittedTitle
                ? titleSearchResults
                : recipeDBSearchResults
              )?.length > 0 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {(submittedTitle
                    ? titleSearchResults
                    : recipeDBSearchResults
                  ).map((recipe, index) => (
                    <motion.div
                      key={recipe._id ?? recipe.Recipe_id ?? `${recipe.Recipe_title}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <RecipeDBCard recipe={recipe} />
                    </motion.div>
                  ))}
                </div>

                {!submittedTitle && totalPages && totalPages > 1 && (
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                    <button
                      type="button"
                      disabled={recipeDBPageNumber <= 1 || recipeDBLoading}
                      onClick={() => loadRecipeDBPage(recipeDBPageNumber - 1)}
                      className="rounded-full border border-[#244b3b]/15 bg-white px-4 py-2 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[#71736a]">
                      Page {recipeDBPageNumber} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={
                        recipeDBPageNumber >= totalPages || recipeDBLoading
                      }
                      onClick={() => loadRecipeDBPage(recipeDBPageNumber + 1)}
                      className="rounded-full border border-[#244b3b]/15 bg-white px-4 py-2 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : submittedTitle ? (
              <div className="rounded-2xl border border-dashed border-[#244b3b]/20 bg-white/60 px-6 py-16 text-center">
                <p className="font-editorial text-2xl text-[#292c27]">
                  No RecipeDB titles found.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#244b3b]/20 bg-white/60 px-6 py-16 text-center">
                <p className="font-editorial text-2xl text-[#292c27]">
                  No recipes match on this page.
                </p>
                <p className="mt-2 text-sm text-[#71736a]">
                  Try a different search, or move to another RecipeDB page.
                </p>
              </div>
            )}
          </>
        ) : filteredRecipes.length > 0 ? (
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
              No recipes match those filters.
            </p>
            <p className="mt-2 text-sm text-[#71736a]">
              Try another search or clear the cuisine filter.
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