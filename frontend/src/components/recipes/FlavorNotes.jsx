import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Leaf, LoaderCircle, RotateCcw } from "lucide-react";
import { getFlavorDBEntityMolecules } from "@/lib/api.js";

const PROFILE_FIELDS = [
  ["flavor_profile", "Flavor profile"],
  ["fooddb_flavor_profile", "FoodDB flavor profile"],
  ["fema_flavor_profile", "FEMA flavor profile"],
  ["taste", "Taste"],
  ["odor", "Odor"],
];

function displayProfile(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          typeof item === "string" ||
          (typeof item === "number" && Number.isFinite(item)),
      )
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function groupEntities(ingredientMatches) {
  const grouped = new Map();

  for (const item of ingredientMatches) {
    if (item.flavordb_entity_id == null) continue;

    const entityId = String(item.flavordb_entity_id).trim();
    if (!entityId) continue;

    if (!grouped.has(entityId)) {
      grouped.set(entityId, {
        id: entityId,
        name: item.flavordb_entity_name,
        ingredients: [],
        valid: /^[1-9]\d*$/.test(entityId),
      });
    }

    const entity = grouped.get(entityId);
    if (item.flavordb_entity_name && !entity.name) {
      entity.name = item.flavordb_entity_name;
    }
    if (
      item.ingredient &&
      !entity.ingredients.includes(item.ingredient)
    ) {
      entity.ingredients.push(item.ingredient);
    }
  }

  return [...grouped.values()];
}

function FlavorNotes({ ingredientMatches }) {
  const entities = useMemo(
    () => groupEntities(ingredientMatches),
    [ingredientMatches],
  );
  const [results, setResults] = useState({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const initialResults = Object.fromEntries(
      entities.map((entity) => [
        entity.id,
        entity.valid ? { status: "loading" } : { status: "error" },
      ]),
    );
    setResults(initialResults);

    for (const entity of entities) {
      if (!entity.valid) continue;

      getFlavorDBEntityMolecules(entity.id)
        .then((molecules) => {
          if (!Array.isArray(molecules)) {
            throw new Error("FlavorDB returned an unexpected response.");
          }
          if (!cancelled) {
            setResults((current) => ({
              ...current,
              [entity.id]: { status: "loaded", molecules },
            }));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setResults((current) => ({
              ...current,
              [entity.id]: {
                status: "error",
                message:
                  error.message ||
                  "We couldn’t load flavor notes for this ingredient.",
              },
            }));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [entities, retryCount]);

  if (entities.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[#244b3b]/10 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-primary">
          <Leaf size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6c4d]">
            FlavorDB references
          </p>
          <h3 className="mt-1 font-editorial text-xl text-[#292c27]">
            Flavor notes
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#65685f]">
            Recorded flavor, taste, or odor profiles when available. These
            notes describe linked ingredient records; they do not explain a
            cooking fault.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {entities.map((entity) => {
          const result = results[entity.id] ?? { status: "loading" };
          const heading =
            entity.name || entity.ingredients.join(", ") || `Entity ${entity.id}`;

          return (
            <li
              key={entity.id}
              className="rounded-xl bg-[#faf8f3] px-3 py-3"
            >
              <p className="text-xs font-medium text-[#292c27]">{heading}</p>
              {entity.name && entity.ingredients.length > 0 && (
                <p className="mt-1 text-[10px] text-[#71736a]">
                  Linked from {entity.ingredients.join(", ")}
                </p>
              )}

              {result.status === "loading" && (
                <p
                  role="status"
                  className="mt-2 flex items-center gap-2 text-[10px] text-[#71736a]"
                >
                  <LoaderCircle
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Loading flavor notes…
                </p>
              )}

              {result.status === "error" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8d342a]">
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>
                    {result.message ??
                      "This linked FlavorDB entity ID is not a valid positive integer."}
                  </span>
                  {entity.valid && (
                    <button
                      type="button"
                      onClick={() => setRetryCount((count) => count + 1)}
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      Retry
                    </button>
                  )}
                </div>
              )}

              {result.status === "loaded" &&
                (() => {
                  const notes = result.molecules.flatMap((molecule) =>
                    PROFILE_FIELDS.flatMap(([field, label]) => {
                      const value = displayProfile(molecule[field]);
                      return value ? [{ field, label, value }] : [];
                    }),
                  );

                  return notes.length > 0 ? (
                    <dl className="mt-2 space-y-1.5">
                      {notes.map((note, index) => (
                        <div
                          key={`${note.field}-${index}`}
                          className="text-[10px] leading-5 text-[#65685f]"
                        >
                          <dt className="inline font-semibold text-[#50554d]">
                            {note.label}:{" "}
                          </dt>
                          <dd className="inline">{note.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-[10px] text-[#71736a]">
                      No flavor, taste, or odor profiles were recorded.
                    </p>
                  );
                })()}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default FlavorNotes;
