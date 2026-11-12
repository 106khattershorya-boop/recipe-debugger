import { useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  Flame,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router";
import { getRecipeDBRecipe } from "@/lib/api.js";

function displayNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function ingredientLine(ingredient) {
  const phrase =
    typeof ingredient.ingredient_Phrase === "string"
      ? ingredient.ingredient_Phrase.trim()
      : "";
  const amountParts = [ingredient.quantity, ingredient.unit].filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "",
  );
  const amountAndUnit = amountParts.join(" ");
  const escapedUnit = String(ingredient.unit ?? "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const phraseIncludesUnit =
    escapedUnit &&
    new RegExp(`(?:^|\\s)${escapedUnit}(?:$|[\\s,])`, "i").test(phrase);
  const phraseStartsWithAmount =
    /^\s*(?:\d+(?:\s+\d+\/\d+|\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])/u.test(phrase);
  const phraseHasFullAmount =
    phraseStartsWithAmount &&
    (!ingredient.unit || phraseIncludesUnit);

  if (
    amountAndUnit &&
    (phrase.toLowerCase().startsWith(amountAndUnit.toLowerCase()) ||
      phraseHasFullAmount ||
      (ingredient.quantity == null && phraseIncludesUnit))
  ) {
    return phrase;
  }

  if (amountParts.length > 0) {
    return [
      ...amountParts,
      ingredient.ingredient || phrase,
      ingredient.state,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "",
      )
      .join(" ");
  }

  if (phrase) return phrase;

  return [ingredient.ingredient, ingredient.state]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    )
    .join(" ");
}

function splitInstructionText(text) {
  const cleanedText = text
    .replace(/\s+([,;:.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedText) return [];

  return cleanedText
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function instructionLines(instructions) {
  if (!Array.isArray(instructions)) return "";

  return instructions
    .flatMap((instruction) =>
      typeof instruction?.steps === "string"
        ? splitInstructionText(instruction.steps)
        : [],
    )
    .join("\n");
}

function RecipeDBCard({ recipe }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const title = recipe.Recipe_title || "Untitled recipe";
  const region = recipe.Region || recipe.Sub_region || recipe.Continent;
  const minutes = displayNumber(
    recipe.TotalTimeNum,
    recipe.total_time,
    recipe.total_time_minutes,
  );
  const calories = displayNumber(recipe.CaloriesNum, recipe.Calories);
  const imageUrl =
    typeof recipe.img_url === "string" && recipe.img_url.trim()
      ? recipe.img_url
      : null;

  async function useRecipe() {
    setLoading(true);
    setError("");

    try {
      const result = await getRecipeDBRecipe(recipe.Recipe_id);
      const detail = result?.data;
      const ingredientsText = Array.isArray(detail?.ingredients)
        ? detail.ingredients.map(ingredientLine).filter(Boolean).join("\n")
        : "";
      const stepsText = instructionLines(detail?.instructions);
      const recipedbProcesses =
        typeof detail?.recipe?.Processes === "string"
          ? detail.recipe.Processes.split("||").map((process) =>
              process.trim(),
            )
          : undefined;

      navigate("/debugger", {
        state: {
          recipe: {
            title: detail?.recipe?.Recipe_title || title,
            ingredientsText,
            stepsText,
            recipedbProcesses,
          },
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "We couldn’t load this recipe’s details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#244b3b]/10 bg-white transition-shadow hover:shadow-[0_18px_45px_rgba(41,44,39,0.11)]">
      <div className="relative h-52 overflow-hidden bg-[#eae5d9]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_70%_20%,#d9cbb1,transparent_45%),linear-gradient(135deg,#eae5d9,#d7dfcf)]">
            <span className="rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-medium text-primary">
              RecipeDB record
            </span>
          </div>
        )}

        <span className="absolute left-4 top-4 rounded-full bg-[#f4f0e7]/95 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-primary">
          RecipeDB
        </span>
      </div>

      <div className="p-5">
        {region && (
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6c4d]">
            <MapPin size={13} aria-hidden="true" />
            {region}
          </p>
        )}

        <h2 className="mt-2 font-editorial text-2xl leading-snug text-[#292c27]">
          {title}
        </h2>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#244b3b]/10 pt-4 text-[11px] text-[#74766e]">
          {minutes !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} aria-hidden="true" />
              {minutes} min
            </span>
          )}
          {calories !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Flame size={14} aria-hidden="true" />
              {calories} calories
            </span>
          )}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.Recipe_id && (
            <span className="text-[10px] text-[#929187]">
              RecipeDB · {recipe.Recipe_id}
            </span>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#71736a]">
          Load this RecipeDB record’s ingredients and instructions into the
          debugger, then review them against what you used.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={useRecipe}
            disabled={loading || !recipe.Recipe_id}
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:gap-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading recipe…
              </>
            ) : error ? (
              <>
                Try again
                <ArrowUpRight size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                Use this recipe
                <ArrowUpRight size={15} aria-hidden="true" />
              </>
            )}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs leading-5 text-[#a33c2f]">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default RecipeDBCard;