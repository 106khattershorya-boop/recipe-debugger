import { useState } from "react";
import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  ExternalLink,
  Info,
  Leaf,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import FaultTrace from "@/components/recipes/FaultTrace.jsx";
import {
  answerFollowup,
  diagnoseRecipe,
  parseRecipe,
  previewCounterfactual,
  saveRepair,
  sendFeedback,
} from "@/lib/api.js";

const symptoms = [
  { label: "Dense", value: "dense" },
  { label: "Dry", value: "dry" },
  { label: "Too salty", value: "too_salty" },
  { label: "Did not rise", value: "did_not_rise" },
  { label: "Greasy", value: "greasy" },
  { label: "Crumbly", value: "crumbly" },
  { label: "Hard in the centre", value: "hard_in_centre" },
  { label: "Cracked while frying", value: "cracked_while_frying" },
];

const cuisines = [
  "Choose a cuisine",
  "Indian",
  "Italian",
  "Japanese",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Other",
];

const diets = [
  "No preference",
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Other",
];

const recipeFamilies = [
  { label: "Choose a recipe type", value: "" },
  { label: "Baked goods", value: "baked_goods" },
];

const featureLabels = {
  fat_to_flour: "Fat compared with flour",
  leavening_to_flour: "Raising agent compared with flour",
  moisture_to_flour: "Moisture compared with flour",
  sweetness_to_flour: "Sweetness compared with flour",
};

const statusLabels = {
  fired: "Worth checking",
  unknown: "Not enough information",
  not_triggered: "No issue spotted",
  symptom_mismatch: "Not related to the result selected",
  screen_activated: "Now worth checking",
  screen_deactivated: "No longer flagged",
  unchanged: "No change",
};

function plainSource(source) {
  const labels = {
    team_heuristic: "Early cooking guide · still being evaluated",
    rule_reference: "Published cooking reference",
    corpus: "Recipe data",
    user_stated: "You reported this",
    inferred: "Estimated from the recipe",
  };

  return labels[source] ?? "Source information";
}

function plainWarning(warning) {
  const text = warning.toLowerCase();

  if (text.includes("heuristic")) {
    return "This is an early cooking guide. It has not been checked for every recipe.";
  }
  if (text.includes("hypotheses are ranked leads")) {
    return "These are possibilities to investigate, not confirmed causes.";
  }
  if (text.includes("no current rule fired")) {
    return "We didn’t find a match in the checks available for this recipe. Other causes may still be possible.";
  }
  if (text.includes("recipe family is missing")) {
    return "Choose a recipe type to get the checks currently available for that kind of recipe.";
  }
  if (text.includes("available checks do not cover")) {
    return "The available checks don’t cover this recipe and result combination yet.";
  }
  if (text.includes("expected_result is accepted")) {
    return "Your expected result isn’t used in these checks yet.";
  }
  if (text.includes("ingredient cross-references identify")) {
    return "Ingredient matches help identify products in the food databases; they don’t explain why a recipe went wrong.";
  }
  if (text.includes("linked flavordb entity name")) {
    return "A food database ingredient name helped us look up its likely role. That role is still an estimate.";
  }
  if (text.includes("follow-up answer is user-stated")) {
    return "This is information you reported. We haven’t independently verified it.";
  }
  if (text.includes("oil temperature was reported by the cook")) {
    return "You reported this oil-temperature information. It wasn’t verified or used to change the diagnosis checks.";
  }
  if (text.includes("llm explanation")) {
    return "An extra written explanation isn’t available right now. The recipe checks are unchanged.";
  }
  if (text.includes("rule screen changes are comparisons")) {
    return "A change in a recipe check is not a prediction of how the food will turn out.";
  }
  if (
    text.includes("ratio only") ||
    text.includes("recalculates recipe ratios")
  ) {
    return "This preview compares recipe amounts. It can’t predict the finished taste or texture.";
  }
  if (text.includes("cooking outcome has not been tested")) {
    return "This saved change hasn’t been tested by cooking it.";
  }

  return warning
    .replaceAll("team_heuristic", "early cooking guide")
    .replaceAll("rule_reference", "published cooking reference")
    .replaceAll("LLM", "written")
    .replaceAll("backend", "recipe checker");
}

function plainTitle(item) {
  if (item.rule_id === "baking_low_leavening_screen") {
    return "There may not be enough raising agent";
  }

  return item.title
    .replace(/^Prototype flag:\s*/i, "Possible clue: ")
    .replaceAll("leavening", "raising agent")
    .replaceAll("relative to flour", "compared with flour");
}

function formatValue(value) {
  if (value === null || value === undefined) return "Not measured";
  if (typeof value === "number") return Number(value.toFixed(4)).toString();
  return String(value);
}

function formatFeature(value) {
  return value.replaceAll("_", " ");
}

function targetName(target, ingredients) {
  const match = target.match(/^ingredients\[(\d+)\]\.grams$/);
  if (!match) return "Recipe amount changed";
  return ingredients[Number(match[1])]?.name ?? "Ingredient amount changed";
}

function FieldLabel({ htmlFor, children, optional = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center justify-between text-xs font-semibold text-[#444a42]"
    >
      <span>{children}</span>
      {optional && <span className="font-normal text-[#929187]">Optional</span>}
    </label>
  );
}

function TextArea({ id, value, onChange, placeholder, rows = 5 }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-xl border border-[#244b3b]/15 bg-white px-4 py-3 text-sm leading-6 text-[#292c27] outline-none transition placeholder:text-[#a09e95] focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
    />
  );
}

function SectionCard({ icon: Icon, eyebrow, title, children }) {
  return (
    <section className="rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-primary">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6c4d]">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-editorial text-xl text-[#292c27]">{title}</h3>
        </div>
      </div>
      <div className="mt-4 text-sm leading-6 text-[#65685f]">{children}</div>
    </section>
  );
}

function StatusBadge({ status }) {
  const styles = {
    fired: "bg-[#f4e8dc] text-[#87572f]",
    unknown: "bg-[#f3f0e8] text-[#69685f]",
    not_triggered: "bg-[#e8f1e9] text-[#356348]",
    symptom_mismatch: "bg-[#f3f0e8] text-[#69685f]",
    screen_activated: "bg-[#f4e8dc] text-[#87572f]",
    screen_deactivated: "bg-[#e8f1e9] text-[#356348]",
    unchanged: "bg-[#f3f0e8] text-[#69685f]",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${
        styles[status] ?? styles.unknown
      }`}
    >
      {statusLabels[status] ?? "Needs a closer look"}
    </span>
  );
}

function IngredientList({ heading, items }) {
  return (
    <div className="rounded-lg bg-[#faf8f3] p-3">
      <p className="text-[9px] uppercase tracking-wide text-[#85867f]">
        {heading}
      </p>
      {items.map((ingredient, index) => (
        <p key={`${ingredient.name}-${index}`} className="mt-2">
          {ingredient.name}: {formatValue(ingredient.grams)} g
        </p>
      ))}
    </div>
  );
}

function DebuggerPage() {
  const location = useLocation();
  const initialRecipe = location.state?.recipe;
  const starterName = location.state?.initialRecipeName ?? "";

  const [recipeName, setRecipeName] = useState(
    initialRecipe?.title ?? starterName,
  );
  const [ingredientsText, setIngredientsText] = useState(
    initialRecipe?.ingredientsText ??
      initialRecipe?.ingredients
        ?.map((item) => `${item.amount} ${item.name}`)
        .join("\n") ??
      "",
  );
  const [stepsText, setStepsText] = useState(
    initialRecipe?.stepsText ??
      initialRecipe?.steps
        ?.map((step, index) => `${index + 1}. ${step}`)
        .join("\n") ??
      "",
  );
  const [cuisine, setCuisine] = useState(initialRecipe?.cuisine ?? "");
  const [dietaryPreference, setDietaryPreference] = useState("No preference");
  const [recipeFamily, setRecipeFamily] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [imageName, setImageName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [followupValue, setFollowupValue] = useState("");
  const [report, setReport] = useState(null);
  const [ingredientIndex, setIngredientIndex] = useState("");
  const [proposedGrams, setProposedGrams] = useState("");
  const [preview, setPreview] = useState(null);
  const [savedRepair, setSavedRepair] = useState(null);
  const [feedbackOutcome, setFeedbackOutcome] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const diagnosis = report?.diagnosis;
  const possibleReasons = diagnosis?.hypotheses ?? [];
  const checks = diagnosis?.rule_checks ?? [];
  const faultTrace = report?.fault_trace;
  const ingredientMatches = report?.ingredient_cross_references ?? [];
  const rawWarnings = report?.warnings ?? [];
  const writtenNotes = report?.llm_explanation?.hypotheses ?? [];
  const ingredients = report?.recipe?.ingredients ?? [];
  const ingredientsWithWeights = ingredients
    .map((ingredient, index) => ({ ...ingredient, index }))
    .filter(
      (ingredient) =>
        typeof ingredient.grams === "number" &&
        Number.isFinite(ingredient.grams),
    );

  const warnings = rawWarnings
    .map(plainWarning)
    .filter(
      (warning) =>
        !warning.toLowerCase().includes("is not configured or no hypotheses"),
    );

  function toggleSymptom(value) {
    setSelectedSymptoms((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setErrorMessage("");
  }

  async function handleAnalyze(event) {
    event.preventDefault();

    if (!recipeName.trim()) {
      setErrorMessage("Add a name for your recipe.");
      return;
    }
    if (!ingredientsText.trim()) {
      setErrorMessage("Add at least one ingredient and its amount.");
      return;
    }
    if (!selectedSymptoms.length) {
      setErrorMessage("Choose the result you got from the recipe.");
      return;
    }

    setErrorMessage("");
    setReport(null);
    setPreview(null);
    setSavedRepair(null);
    setFeedbackSent(false);
    setIsAnalyzing(true);

    try {
      const parsed = await parseRecipe({
        name: recipeName.trim(),
        family: recipeFamily || null,
        ingredients_text: ingredientsText.trim(),
        steps_text: stepsText.trim(),
        ...(initialRecipe?.recipedbProcesses
          ? { recipedb_processes: initialRecipe.recipedbProcesses }
          : {}),
      });

      const result = await diagnoseRecipe({
        recipe_id: parsed.recipe_id,
        reported_symptoms: selectedSymptoms,
      });

      setReport({ ...result, recipe: parsed.recipe });

      const firstMeasured = parsed.recipe?.ingredients?.findIndex(
        (ingredient) =>
          typeof ingredient.grams === "number" &&
          Number.isFinite(ingredient.grams),
      );

      if (firstMeasured >= 0) {
        setIngredientIndex(String(firstMeasured));
        setProposedGrams(
          String(parsed.recipe.ingredients[firstMeasured].grams),
        );
      } else {
        setIngredientIndex("");
        setProposedGrams("");
      }

      window.setTimeout(() => {
        document
          .getElementById("analysis-report")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      setErrorMessage(
        error.message || "We couldn’t check this recipe. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleFollowup(event) {
    event.preventDefault();

    if (!diagnosis?.diagnosis_id || !diagnosis?.followup_question_id) return;
    if (!followupValue.trim()) {
      setErrorMessage("Add your answer to continue.");
      return;
    }

    setErrorMessage("");
    setIsAnswering(true);

    try {
      const updated = await answerFollowup(diagnosis.diagnosis_id, {
        question_id: diagnosis.followup_question_id,
        value: followupValue.trim(),
      });

      setReport((current) => ({
        ...current,
        ...updated,
        recipe: current.recipe,
      }));
      setPreview(null);
      setSavedRepair(null);
      setFeedbackOutcome("");
      setFeedbackSent(false);
      setFollowupValue("");
    } catch (error) {
      setErrorMessage(
        error.message || "We couldn’t update the recipe report. Try again.",
      );
    } finally {
      setIsAnswering(false);
    }
  }

  async function handlePreview(event) {
    event.preventDefault();

    const amount = Number(proposedGrams);
    const index = Number(ingredientIndex);

    if (!diagnosis?.diagnosis_id) {
      setErrorMessage("Check the recipe before trying a change.");
      return;
    }
    if (!Number.isInteger(index) || !ingredients[index]) {
      setErrorMessage("Choose an ingredient with a measured gram amount.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter an amount greater than zero.");
      return;
    }

    setErrorMessage("");
    setPreview(null);
    setSavedRepair(null);
    setFeedbackSent(false);
    setIsPreviewing(true);

    try {
      const result = await previewCounterfactual({
        diagnosis_id: diagnosis.diagnosis_id,
        changes: [
          {
            target: `ingredients[${index}].grams`,
            from_value: ingredients[index].grams,
            to_value: amount,
            unit: "g",
          },
        ],
      });
      setPreview(result);
    } catch (error) {
      setErrorMessage(
        error.message || "We couldn’t compare that change. Please try again.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSaveRepair() {
    if (!diagnosis?.diagnosis_id || !preview?.changes?.length) return;

    setErrorMessage("");
    setSavedRepair(null);
    setFeedbackOutcome("");
    setFeedbackNote("");
    setFeedbackSent(false);
    setIsSaving(true);

    try {
      const result = await saveRepair({
        diagnosis_id: diagnosis.diagnosis_id,
        changes: preview.changes.map((change) => ({
          target: change.target,
          from_value: change.from_value,
          to_value: change.to_value,
          unit: change.unit,
        })),
      });
      setSavedRepair(result);
    } catch (error) {
      setErrorMessage(
        error.message || "We couldn’t save this change. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFeedback(event) {
    event.preventDefault();

    if (!diagnosis?.diagnosis_id || !feedbackOutcome) {
      setErrorMessage("Choose how the change worked before sending feedback.");
      return;
    }

    setErrorMessage("");
    setIsSendingFeedback(true);

    try {
      await sendFeedback({
        diagnosis_id: diagnosis.diagnosis_id,
        outcome: feedbackOutcome,
        note: feedbackNote.trim() || null,
      });
      setFeedbackSent(true);
    } catch (error) {
      setErrorMessage(
        error.message || "We couldn’t send your feedback. Please try again.",
      );
    } finally {
      setIsSendingFeedback(false);
    }
  }

  function resetForm() {
    setRecipeName("");
    setIngredientsText("");
    setStepsText("");
    setCuisine("");
    setDietaryPreference("No preference");
    setRecipeFamily("");
    setSelectedSymptoms([]);
    setImageName("");
    setErrorMessage("");
    setReport(null);
    setFollowupValue("");
    setIngredientIndex("");
    setProposedGrams("");
    setPreview(null);
    setSavedRepair(null);
    setFeedbackOutcome("");
    setFeedbackNote("");
    setFeedbackSent(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const ingredientCount = ingredientsText
    .split(/\r?\n/)
    .filter((line) => line.trim()).length;
  const stepCount = stepsText
    .split(/\r?\n/)
    .filter((line) => line.trim()).length;

  return (
    <main className="min-h-screen bg-[#f4f0e7]">
      <section className="border-b border-[#244b3b]/10 bg-[#eae5d9]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#64685f] hover:text-primary"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to FlavoLens
          </Link>

          <div className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Recipe Debugger
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl leading-tight tracking-[-0.045em] text-[#292c27] sm:text-5xl">
                Let’s work out what happened.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65685f]">
                Tell us what you made and how it turned out. We’ll show the
                recipe details and possible clues we can check.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`mx-auto grid max-w-[1440px] gap-8 px-5 py-8 sm:px-8 lg:px-12 lg:py-12 ${
          report
            ? "lg:grid-cols-1"
            : "lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)]"
        }`}
      >
        <form
          onSubmit={handleAnalyze}
          className={`space-y-5 ${report ? "lg:max-w-4xl" : ""}`}
        >
          <section className="rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
                  01 · Your recipe
                </p>
                <h2 className="mt-2 font-editorial text-2xl text-[#292c27]">
                  Start with the basics
                </h2>
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-[#f4f0e7] text-primary">
                <Leaf size={17} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="recipe-name">Recipe name</FieldLabel>
                <input
                  id="recipe-name"
                  value={recipeName}
                  onChange={(event) => setRecipeName(event.target.value)}
                  placeholder="e.g. Orange olive oil cake"
                  className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <FieldLabel htmlFor="recipe-family" optional>
                  What kind of recipe is it?
                </FieldLabel>
                <select
                  id="recipe-family"
                  value={recipeFamily}
                  onChange={(event) => setRecipeFamily(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-3 text-sm text-[#50554d] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                >
                  {recipeFamilies.map((family) => (
                    <option key={family.value || "empty"} value={family.value}>
                      {family.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-4 text-[#85867f]">
                  Recipe checks are currently available for baked goods.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="recipe-cuisine" optional>
                  Cuisine
                </FieldLabel>
                <select
                  id="recipe-cuisine"
                  value={cuisine}
                  onChange={(event) => setCuisine(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-3 text-sm text-[#50554d] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                >
                  {cuisines.map((option) => (
                    <option
                      key={option}
                      value={option === "Choose a cuisine" ? "" : option}
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel htmlFor="dietary-preference" optional>
                  Dietary preference
                </FieldLabel>
                <select
                  id="dietary-preference"
                  value={dietaryPreference}
                  onChange={(event) => setDietaryPreference(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-3 text-sm text-[#50554d] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                >
                  {diets.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              02 · Ingredients and instructions
            </p>
            <h2 className="mt-2 font-editorial text-2xl text-[#292c27]">
              What went into the dish?
            </h2>

            <div className="mt-6">
              <FieldLabel htmlFor="ingredients">
                Ingredients and amounts
              </FieldLabel>
              <TextArea
                id="ingredients"
                value={ingredientsText}
                onChange={(event) => setIngredientsText(event.target.value)}
                placeholder={
                  "200 g all-purpose flour\n100 g butter\n5 g baking powder"
                }
                rows={5}
              />
              <p className="mt-2 text-[10px] text-[#85867f]">
                Put one ingredient on each line. Measured amounts help us
                compare proportions.
              </p>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="steps" optional>
                How did you make it?
              </FieldLabel>
              <TextArea
                id="steps"
                value={stepsText}
                onChange={(event) => setStepsText(event.target.value)}
                placeholder={
                  "1. Mix the dry ingredients.\n2. Fold in the wet ingredients.\n3. Bake until set."
                }
                rows={5}
              />
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-[#244b3b]/20 bg-[#faf8f3] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-primary">
                    <Info size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#444a42]">
                      Add a photo
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-[#85867f]">
                      We don’t inspect photos yet.
                    </p>
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#244b3b]/15 bg-white px-4 py-2 text-xs font-medium text-primary hover:bg-[#f4f0e7]">
                  Choose image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) =>
                      setImageName(event.target.files?.[0]?.name ?? "")
                    }
                  />
                </label>
              </div>
              {imageName && (
                <p className="mt-3 truncate text-[10px] text-[#64685f]">
                  Selected: {imageName}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              03 · What went wrong?
            </p>
            <h2 className="mt-2 font-editorial text-2xl text-[#292c27]">
              How did it turn out?
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#71736a]">
              Choose everything you noticed. These are your observations, not
              conclusions about the cause.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {symptoms.map((symptom) => {
                const selected = selectedSymptoms.includes(symptom.value);
                return (
                  <button
                    key={symptom.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSymptom(symptom.value)}
                    className={`rounded-full border px-3.5 py-2 text-xs transition ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-[#244b3b]/15 bg-white text-[#50554d] hover:border-primary"
                    }`}
                  >
                    {symptom.label}
                  </button>
                );
              })}
            </div>
          </section>

          {errorMessage && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[#a33c2f]/20 bg-[#a33c2f]/5 px-4 py-3 text-xs leading-5 text-[#8d342a]"
            >
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={isAnalyzing}
              className="h-12 rounded-full px-6 normal-case tracking-normal"
            >
              {isAnalyzing ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              {isAnalyzing ? "Checking your recipe…" : "Check my recipe"}
              {!isAnalyzing && <ArrowRight size={16} aria-hidden="true" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={
                isAnalyzing ||
                isAnswering ||
                isPreviewing ||
                isSaving ||
                isSendingFeedback
              }
              className="h-12 rounded-full px-5 normal-case tracking-normal"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Start over
            </Button>
          </div>
          <p className="text-[10px] leading-5 text-[#85867f]">
            Cuisine and dietary preference aren’t used in the recipe checks yet.
          </p>
        </form>

        <aside
          className={
            report ? "w-full" : "lg:sticky lg:top-24 lg:self-start"
          }
        >
          {!report ? (
            <div className="rounded-2xl border border-dashed border-[#244b3b]/20 bg-white/55 p-6 sm:p-8">
              <span className="grid size-11 place-items-center rounded-full bg-[#eae5d9] text-primary">
                <CircleHelp size={19} aria-hidden="true" />
              </span>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
                Your recipe report
              </p>
              <h2 className="mt-2 font-editorial text-2xl text-[#292c27]">
                Ready when you are.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#71736a]">
                Share the ingredients, amounts, and result. We’ll show the
                checks we can make with the information available.
              </p>
            </div>
          ) : (
            <motion.div
              id="analysis-report"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-5xl space-y-4 scroll-mt-24"
            >
              <div className="rounded-2xl border border-[#244b3b]/10 bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6c4d]">
                  Your recipe report
                </p>
                <h2 className="mt-2 font-editorial text-2xl text-[#292c27]">
                  {report.recipe?.name ?? recipeName}
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#71736a]">
                  {possibleReasons.length
                    ? "Here are a few possible clues to review."
                    : "We didn’t find a likely cause in the checks available yet. Other causes may still be possible."}
                </p>
              </div>

              {diagnosis?.followup_question && (
                <SectionCard
                  icon={CircleHelp}
                  eyebrow="A quick question"
                  title="One more detail would help"
                >
                  <p>{diagnosis.followup_question}</p>
                  <form onSubmit={handleFollowup} className="mt-4 space-y-3">
                    <input
                      value={followupValue}
                      onChange={(event) => setFollowupValue(event.target.value)}
                      aria-label="Your answer"
                      placeholder={
                        diagnosis.followup_feature ===
                        "frying_oil_temperature"
                          ? "For example: 180°C, or “I’m not sure”"
                          : "For example: 5 g baking powder"
                      }
                      className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    />
                    <Button
                      type="submit"
                      disabled={isAnswering}
                      className="h-10 rounded-full px-4 normal-case tracking-normal"
                    >
                      {isAnswering ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check size={15} aria-hidden="true" />
                      )}
                      {isAnswering ? "Updating report…" : "Use my answer"}
                    </Button>
                  </form>
                </SectionCard>
              )}

              {report.followup_answer?.source ===
                "Reported by the cook; not independently verified." && (
                <SectionCard
                  icon={Info}
                  eyebrow="Your reported information"
                  title="Oil temperature"
                >
                  <p>You reported: {report.followup_answer.value}</p>
                  <p className="mt-2 text-xs">
                    This hasn’t been independently verified and wasn’t used to
                    change the diagnosis checks.
                  </p>
                </SectionCard>
              )}

              {possibleReasons.map((item) => {
                const note = writtenNotes.find(
                  (entry) => entry.hypothesis_id === item.id,
                );

                return (
                  <SectionCard
                    key={item.id}
                    icon={AlertCircle}
                    eyebrow={`Possible reason · ${item.confidence_label} confidence`}
                    title={plainTitle(item)}
                  >
                    {note?.explanation && <p>{note.explanation}</p>}
                    {item.uncertainty && (
                      <p className="mt-2">{plainWarning(item.uncertainty)}</p>
                    )}
                    {item.evidence?.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {item.evidence.map((evidence) => (
                          <li
                            key={evidence.id}
                            className="rounded-lg bg-[#faf8f3] px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-[#292c27]">
                              {plainSource(evidence.grade)}:
                            </span>{" "}
                            {evidence.text.replace(
                              /^Team heuristic applied:\s*/i,
                              "",
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {note?.uncertainty_note && (
                      <p className="mt-3 text-xs">
                        {plainWarning(note.uncertainty_note)}
                      </p>
                    )}
                  </SectionCard>
                );
              })}

              {checks.length > 0 && (
                <SectionCard
                  icon={Check}
                  eyebrow="What we checked"
                  title="Recipe checks"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {checks.map((check) => (
                      <div
                        key={check.rule_id}
                        className="rounded-xl border border-[#244b3b]/10 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium text-[#292c27]">
                            {plainTitle(check)}
                          </p>
                          <StatusBadge status={check.status} />
                        </div>
                        <p className="mt-2 text-xs">
                          Your recipe: {formatValue(check.measured_value)} ·
                          guide: {formatValue(check.threshold)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#85867f]">
                          {plainSource(check.source)}
                          {check.source_reference
                            ? ` · ${check.source_reference}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {ingredientsWithWeights.length > 0 && (
                <SectionCard
                  icon={SlidersHorizontal}
                  eyebrow="Try a different amount"
                  title="Compare a recipe change"
                >
                  <p>
                    Choose an ingredient and try another amount. We’ll compare
                    recipe proportions and checks; this can’t predict exactly
                    how the dish will turn out.
                  </p>

                  <form onSubmit={handlePreview} className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="whatif-ingredient">
                          Ingredient
                        </FieldLabel>
                        <select
                          id="whatif-ingredient"
                          value={ingredientIndex}
                          onChange={(event) => {
                            const nextIndex = event.target.value;
                            setIngredientIndex(nextIndex);
                            setPreview(null);
                            setSavedRepair(null);
                            setFeedbackSent(false);
                            setErrorMessage("");
                            setProposedGrams(
                              String(
                                ingredients[Number(nextIndex)]?.grams ?? "",
                              ),
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-3 text-sm text-[#50554d] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        >
                          {ingredientsWithWeights.map((ingredient) => (
                            <option
                              key={`${ingredient.index}-${ingredient.name}`}
                              value={ingredient.index}
                            >
                              {ingredient.name} · {formatValue(ingredient.grams)} g
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <FieldLabel htmlFor="whatif-grams">
                          New amount in grams
                        </FieldLabel>
                        <input
                          id="whatif-grams"
                          type="number"
                          min="0.01"
                          step="any"
                          value={proposedGrams}
                          onChange={(event) => {
                            setProposedGrams(event.target.value);
                            setPreview(null);
                            setSavedRepair(null);
                            setFeedbackSent(false);
                            setErrorMessage("");
                          }}
                          className="h-11 w-full rounded-xl border border-[#244b3b]/15 bg-white px-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <p role="alert" className="text-xs text-[#8d342a]">
                        {errorMessage}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isPreviewing || isSaving}
                      variant="outline"
                      className="h-10 rounded-full px-4 normal-case tracking-normal"
                    >
                      {isPreviewing ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <SlidersHorizontal size={15} aria-hidden="true" />
                      )}
                      {isPreviewing
                        ? "Comparing amounts…"
                        : "Compare this change"}
                    </Button>
                  </form>
                </SectionCard>
              )}

              {preview && (
                <>
                  <SectionCard
                    icon={Sparkles}
                    eyebrow="Your proposed change"
                    title="Before and after"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(preview.feature_comparison ?? {}).map(
                        ([feature, values]) => (
                          <div
                            key={feature}
                            className="flex items-center justify-between gap-3 rounded-lg bg-[#faf8f3] px-3 py-2"
                          >
                            <span className="text-xs">
                              {featureLabels[feature] ?? formatFeature(feature)}
                            </span>
                            <span className="text-xs tabular-nums text-[#292c27]">
                              {formatValue(values.before)} →{" "}
                              {formatValue(values.after)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold text-[#292c27]">
                        Ingredient amounts
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <IngredientList
                          heading="Original"
                          items={preview.original_recipe?.ingredients ?? []}
                        />
                        <IngredientList
                          heading="Your change"
                          items={preview.counterfactual_recipe?.ingredients ?? []}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  {preview.rule_screen_comparison?.length > 0 && (
                    <SectionCard
                      icon={Check}
                      eyebrow="How the checks changed"
                      title="Recipe check comparison"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {preview.rule_screen_comparison.map((item) => (
                          <div
                            key={item.rule_id}
                            className="rounded-xl border border-[#244b3b]/10 p-3"
                          >
                            <p className="font-medium text-[#292c27]">
                              {plainTitle(item)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span>Before</span>
                              <StatusBadge status={item.status_before} />
                              <ArrowRight size={13} aria-hidden="true" />
                              <span>After</span>
                              <StatusBadge status={item.status_after} />
                            </div>
                            <p className="mt-2 text-[10px] text-[#85867f]">
                              {item.change?.replaceAll("_", " ") ??
                                "No change in this check"}
                              {" · "}
                              {plainSource(item.source)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {preview.warnings?.length > 0 && (
                    <SectionCard
                      icon={Info}
                      eyebrow="A note about this comparison"
                      title="What this can tell you"
                    >
                      <ul className="space-y-2">
                        {preview.warnings.map((warning) => (
                          <li key={warning}>{plainWarning(warning)}</li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  <div className="rounded-2xl border border-[#244b3b]/10 bg-white p-5">
                    <p className="text-sm font-semibold text-[#292c27]">
                      Save this as a recipe experiment?
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#65685f]">
                      Saving records the amounts you chose. It doesn’t mean the
                      change has been tested or is guaranteed to work.
                    </p>
                    <Button
                      type="button"
                      onClick={handleSaveRepair}
                      disabled={isSaving}
                      className="mt-4 h-10 rounded-full px-4 normal-case tracking-normal"
                    >
                      {isSaving ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Save size={15} aria-hidden="true" />
                      )}
                      {isSaving ? "Saving…" : "Save my change"}
                    </Button>

                    {savedRepair && (
                      <div
                        role="status"
                        className="mt-4 rounded-xl border border-[#244b3b]/10 bg-[#e8f1e9] p-3 text-xs text-[#356348]"
                      >
                        <p className="font-semibold">Your change was saved.</p>
                        {savedRepair.changes?.map((change) => (
                          <p key={change.target} className="mt-2">
                            {targetName(change.target, ingredients)}:{" "}
                            {formatValue(change.from_value)} {change.unit ?? ""}{" "}
                            → {formatValue(change.to_value)} {change.unit ?? ""}
                          </p>
                        ))}
                        {savedRepair.warnings?.map((warning) => (
                          <p key={warning} className="mt-2">
                            {plainWarning(warning)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {savedRepair && (
                    <SectionCard
                      icon={MessageSquare}
                      eyebrow="After you try it in your kitchen"
                      title="Did the change work?"
                    >
                      {feedbackSent ? (
                        <div
                          role="status"
                          className="rounded-xl bg-[#e8f1e9] p-4 text-[#356348]"
                        >
                          <p className="font-semibold">
                            Thanks for letting us know.
                          </p>
                          <p className="mt-1 text-xs">
                            Your cooking result has been recorded.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleFeedback}>
                          <p>
                            Once you’ve cooked it, your experience can help you
                            keep track of what happened.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              aria-pressed={feedbackOutcome === "worked"}
                              onClick={() => {
                                setFeedbackOutcome("worked");
                                setErrorMessage("");
                              }}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                                feedbackOutcome === "worked"
                                  ? "border-primary bg-primary text-white"
                                  : "border-[#244b3b]/15 bg-white text-[#50554d]"
                              }`}
                            >
                              <ThumbsUp size={14} aria-hidden="true" />
                              It worked
                            </button>
                            <button
                              type="button"
                              aria-pressed={feedbackOutcome === "did_not_work"}
                              onClick={() => {
                                setFeedbackOutcome("did_not_work");
                                setErrorMessage("");
                              }}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs ${
                                feedbackOutcome === "did_not_work"
                                  ? "border-primary bg-primary text-white"
                                  : "border-[#244b3b]/15 bg-white text-[#50554d]"
                              }`}
                            >
                              <ThumbsDown size={14} aria-hidden="true" />
                              It didn’t
                            </button>
                          </div>

                          <label
                            htmlFor="feedback-note"
                            className="mt-4 block text-xs font-medium text-[#444a42]"
                          >
                            Add a note (optional)
                          </label>
                          <textarea
                            id="feedback-note"
                            value={feedbackNote}
                            onChange={(event) =>
                              setFeedbackNote(event.target.value)
                            }
                            rows={2}
                            maxLength={1000}
                            placeholder="What happened when you tried it?"
                            className="mt-2 w-full resize-y rounded-xl border border-[#244b3b]/15 bg-white px-4 py-3 text-sm text-[#292c27] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                          />

                          {errorMessage && (
                            <p
                              role="alert"
                              className="mt-2 text-xs text-[#8d342a]"
                            >
                              {errorMessage}
                            </p>
                          )}

                          <Button
                            type="submit"
                            disabled={isSendingFeedback || !feedbackOutcome}
                            className="mt-3 h-10 rounded-full px-4 normal-case tracking-normal"
                          >
                            {isSendingFeedback ? (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check size={15} aria-hidden="true" />
                            )}
                            {isSendingFeedback
                              ? "Sending…"
                              : "Send my feedback"}
                          </Button>
                        </form>
                      )}
                    </SectionCard>
                  )}
                </>
              )}

              {ingredientMatches.length > 0 && (
                <SectionCard
                  icon={Leaf}
                  eyebrow="Ingredient matches"
                  title="Food database references"
                >
                  <ul className="grid gap-2 md:grid-cols-2">
                    {ingredientMatches.map((item) => (
                      <li
                        key={`${item.ingredient}-${item.flavordb_entity_id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#faf8f3] px-3 py-2"
                      >
                        <span className="text-xs text-[#292c27]">
                          {item.ingredient}
                          {item.flavordb_entity_name
                            ? ` matches ${item.flavordb_entity_name}`
                            : ""}
                        </span>
                        {item.flavordb_entity_url && (
                          <a
                            href={item.flavordb_entity_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                          >
                            FlavorDB record
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[10px]">
                    These matches identify ingredients in RecipeDB and
                    FlavorDB. They don’t tell us why a dish went wrong.
                  </p>
                </SectionCard>
              )}

              {(faultTrace?.nodes?.length > 0 ||
                faultTrace?.edges?.length > 0) && (
                <FaultTrace
                  nodes={faultTrace.nodes ?? []}
                  edges={faultTrace.edges ?? []}
                  diagnosis={diagnosis}
                  recipe={report.recipe}
                />
              )}

              {warnings.length > 0 && (
                <SectionCard
                  icon={Info}
                  eyebrow="A little context"
                  title="What to keep in mind"
                >
                  <ul className="space-y-2">
                    {warnings.map((warning, index) => (
                      <li key={`${index}-${warning}`}>{warning}</li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </motion.div>
          )}
        </aside>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pb-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-3 border-t border-[#244b3b]/10 pt-5 text-[10px] text-[#85867f] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {ingredientCount} ingredient lines · {stepCount} instruction lines
          </span>
          <span>
            {cuisine || "Cuisine not selected"} · {dietaryPreference}
          </span>
        </div>
      </div>
    </main>
  );
}

export default DebuggerPage;