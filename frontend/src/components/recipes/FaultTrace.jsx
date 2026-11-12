import { useMemo, useState } from "react";
import {
  ArrowRight,
  CircleHelp,
  GitBranch,
  Sparkles,
} from "lucide-react";

const nodeTypeLabels = {
  ingredient: "Ingredient",
  operation: "Cooking step",
  process: "RecipeDB process",
  intermediate: "Recipe measurement",
  symptom: "Reported result",
};

const edgeLabels = {
  USED_IN: "used in",
  FEEDS: "feeds into",
  NEXT: "next in the recorded sequence",
  RATIO: "measured for",
  AFFECTS: "check linked to",
};

function splitInstructionSentences(text) {
  return text
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ingredientAmount(ingredient) {
  const amount =
    typeof ingredient?.raw_quantity === "string" &&
    ingredient.raw_quantity.trim()
      ? ingredient.raw_quantity.trim()
      : typeof ingredient?.quantity === "number" &&
          Number.isFinite(ingredient.quantity)
        ? String(ingredient.quantity)
        : "";

  if (!amount) return "";

  return [amount, ingredient.unit?.trim()].filter(Boolean).join(" ");
}

function TraceNode({ node, ingredient }) {
  const originalAmount = ingredientAmount(ingredient);

  return (
    <div className="min-w-0 rounded-xl border border-[#244b3b]/10 bg-[#faf9f6] px-3 py-2.5 dark:border-white/10 dark:bg-[#292b28]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#85867f] dark:text-[#aaa9a1]">
        {nodeTypeLabels[node.type] ?? "Recipe detail"}
      </p>
      <p className="mt-1 break-words text-xs font-medium leading-5 text-[#292c27] dark:text-[#f1eee6]">
        {node.label}
      </p>
      {originalAmount && (
        <p className="mt-1 text-[10px] leading-4 text-[#65685f] dark:text-[#c6c4bd]">
          Original amount: {originalAmount}
        </p>
      )}
      {(node.grams != null ||
        node.minutes != null ||
        node.temperature_c != null) && (
        <p className="mt-1 text-[10px] leading-4 text-[#65685f] dark:text-[#c6c4bd]">
          {node.grams != null && `${node.grams} g`}
          {node.minutes != null &&
            `${node.grams != null ? " · " : ""}${node.minutes} min`}
          {node.temperature_c != null &&
            `${node.grams != null || node.minutes != null ? " · " : ""}${node.temperature_c}°C`}
        </p>
      )}
    </div>
  );
}

function CheckCard({ check }) {
  const statusText =
    check.status === "fired"
      ? "Possible clue to review"
      : check.status === "not_triggered"
        ? "This check did not flag an issue"
        : check.status === "symptom_mismatch"
          ? "Not related to the selected result"
          : "Not enough information";

  const statusClass =
    check.status === "fired"
      ? "border-[#c94d3f]/30 bg-[#fff1ed] text-[#7d2c24] dark:border-[#e17b6e]/35 dark:bg-[#482723] dark:text-[#ffd5cd]"
      : "border-[#244b3b]/10 bg-[#faf9f6] text-[#50554d] dark:border-white/10 dark:bg-[#292b28] dark:text-[#e6e3dc]";

  return (
    <li className={`rounded-xl border p-3 ${statusClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-5">{check.title}</p>
        <span className="text-[9px] font-semibold uppercase tracking-wide">
          {statusText}
        </span>
      </div>
      {check.measured_value != null && (
        <p className="mt-1 text-[10px] leading-4 opacity-80">
          Measured value: {check.measured_value}
        </p>
      )}
      {check.note && (
        <p className="mt-1 text-[10px] leading-4 opacity-80">{check.note}</p>
      )}
    </li>
  );
}

function FaultTrace({ nodes = [], edges = [], diagnosis, recipe }) {
  const [selectedResultId, setSelectedResultId] = useState("");
  const [showAllProcesses, setShowAllProcesses] = useState(false);

  const ingredientByNodeId = useMemo(
    () =>
      new Map(
        (recipe?.ingredients ?? []).map((ingredient, index) => [
          `ingredient_${index + 1}`,
          ingredient,
        ]),
      ),
    [recipe],
  );

  const operationTextByNodeId = useMemo(
    () =>
      new Map(
        nodes
          .filter((node) => node.type === "operation")
          .map((node, index) => [
            node.id,
            recipe?.steps?.[index]?.text,
          ]),
      ),
    [nodes, recipe],
  );

  const nodesById = useMemo(
    () =>
      new Map(
        nodes.map((node) => [
          node.id,
          node.type === "operation" && operationTextByNodeId.get(node.id)
            ? {
                ...node,
                label: operationTextByNodeId.get(node.id),
              }
            : node,
        ]),
      ),
    [nodes, operationTextByNodeId],
  );

  const evidenceById = useMemo(
    () =>
      new Map(
        (diagnosis?.hypotheses ?? []).flatMap((hypothesis) =>
          (hypothesis.evidence ?? []).map((evidence) => [
            evidence.id,
            evidence,
          ]),
        ),
      ),
    [diagnosis],
  );

  const ingredients = nodes.filter((node) => node.type === "ingredient");
  const operations = nodes.filter((node) => node.type === "operation");
  const cookingSteps = (recipe?.steps ?? []).flatMap((step, stepIndex) =>
    splitInstructionSentences(step.text).map((text, sentenceIndex) => ({
      ...step,
      id: `instruction_${stepIndex + 1}_${sentenceIndex + 1}`,
      type: "operation",
      label: text,
    })),
  );
  const displayedCookingSteps =
    cookingSteps.length > 0 ? cookingSteps : operations;
  const measurements = nodes.filter((node) => node.type === "intermediate");
  const results = nodes.filter((node) => node.type === "symptom");
  const processNodes = nodes
    .filter((node) => node.type === "process")
    .map((node, index) => ({ node, number: index + 1 }));

  const visibleProcessNodes = showAllProcesses
    ? processNodes
    : processNodes.slice(0, 8);

  const selectedResult =
    results.find((node) => node.id === selectedResultId) ?? results[0];

  const checks = diagnosis?.rule_checks ?? [];
  const checksByRuleId = new Map(
    checks.map((check) => [check.rule_id, check]),
  );
  const hypothesesByRuleId = new Map(
    (diagnosis?.hypotheses ?? []).map((hypothesis) => [
      hypothesis.rule_id,
      hypothesis,
    ]),
  );

  const validEdges = edges.filter(
    (edge) => nodesById.has(edge.source_id) && nodesById.has(edge.target_id),
  );

  const visibleEdges = validEdges.filter((edge) => edge.kind !== "NEXT");

  const activeResultLinks = selectedResult
    ? visibleEdges.filter(
        (edge) =>
          edge.target_id === selectedResult.id &&
          edge.kind === "AFFECTS" &&
          edge.active === true,
      )
    : [];

  return (
    <section
      aria-labelledby="fault-trace-title"
      className="rounded-2xl border border-[#244b3b]/10 bg-white p-4 dark:border-white/10 dark:bg-[#222421] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-[#244b3b] dark:bg-[#383a35] dark:text-[#e4dfd3]">
          <GitBranch size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6c4d]">
            Recipe details and checks
          </p>
          <h3
            id="fault-trace-title"
            className="mt-1 font-editorial text-xl text-[#292c27] dark:text-[#f1eee6]"
          >
            Fault Trace
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#65685f] dark:text-[#c6c4bd]">
            Review the recipe information and any checks connected to the
            result you reported. A possible clue is not proof of a cause.
          </p>
        </div>
      </div>

      {results.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-medium text-[#65685f] dark:text-[#c6c4bd]">
            Choose a reported result
          </p>
          <div className="flex flex-wrap gap-2">
            {results.map((result) => {
              const selected = result.id === selectedResult?.id;

              return (
                <button
                  key={result.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedResultId(result.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected
                      ? "border-[#244b3b] bg-[#244b3b] text-white dark:border-[#a6c6ae] dark:bg-[#365642]"
                      : "border-[#244b3b]/15 bg-white text-[#50554d] hover:border-[#244b3b] dark:border-white/15 dark:bg-[#292b28] dark:text-[#e6e3dc]"
                  }`}
                >
                  {result.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedResult && (
        <div
          className={`mt-4 rounded-xl border p-3 sm:p-4 ${
            activeResultLinks.length > 0
              ? "border-[#c94d3f]/35 bg-[#fff1ed] text-[#7d2c24] dark:border-[#e17b6e]/40 dark:bg-[#482723] dark:text-[#ffd5cd]"
              : "border-[#244b3b]/10 bg-[#faf9f6] text-[#50554d] dark:border-white/10 dark:bg-[#292b28] dark:text-[#e6e3dc]"
          }`}
        >
          <div className="flex items-start gap-2 text-xs font-semibold">
            <Sparkles
              size={15}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>Reported result: {selectedResult.label}</span>
          </div>
          {activeResultLinks.length > 0 ? (
            <p className="mt-2 pl-6 text-[11px] leading-5">
              A diagnosis check linked the details below to this result. This
              is a possible clue, not a confirmed cause.
            </p>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-[11px] leading-5">
              <CircleHelp
                size={14}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                No available check linked the entered recipe details to this
                result. Other causes may still be possible.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-5">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6c4d]">
          Recipe details
        </h4>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            { title: "Ingredients", items: ingredients },
            { title: "Cooking steps", items: displayedCookingSteps },
            { title: "Measurements", items: measurements },
            { title: "Reported results", items: results },
          ].map(({ title, items }) => (
            <section
              key={title}
              aria-label={title}
              className="min-w-0 rounded-xl border border-[#244b3b]/10 bg-white p-3 dark:border-white/10 dark:bg-[#292b28]"
            >
              <h5 className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#65685f] dark:text-[#c6c4bd]">
                {title}
              </h5>
              {items.length > 0 ? (
                title === "Cooking steps" ? (
                  <ol className="mt-2 space-y-2">
                    {items.map((node, index) => (
                      <li
                        key={node.id}
                        className="flex items-start gap-2"
                      >
                        <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-[9px] font-semibold text-[#65685f] dark:bg-[#383a35] dark:text-[#e4dfd3]">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <TraceNode node={node} />
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((node) => (
                      <li key={node.id}>
                        <TraceNode
                          node={node}
                          ingredient={ingredientByNodeId.get(node.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="mt-2 text-[10px] leading-4 text-[#85867f] dark:text-[#a6a59e]">
                  No details provided
                </p>
              )}
            </section>
          ))}
        </div>
      </div>

      {processNodes.length > 0 && (
        <section
          aria-label="RecipeDB recorded cooking sequence"
          className="mt-3 rounded-xl border border-[#244b3b]/10 bg-[#faf9f6] p-3 dark:border-white/10 dark:bg-[#292b28]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[10px] font-semibold text-[#50554d] dark:text-[#e6e3dc]">
              RecipeDB’s recorded cooking sequence
            </h4>
            <span className="text-[10px] text-[#85867f] dark:text-[#a6a59e]">
              {processNodes.length} recorded processes
            </span>
          </div>

          <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2">
            {visibleProcessNodes.map(({ node, number }, index) => (
              <li
                key={node.id}
                className="inline-flex min-w-0 items-center gap-1.5"
              >
                {index > 0 && (
                  <ArrowRight
                    size={12}
                    className="shrink-0 text-[#92938c] dark:text-[#aaa9a1]"
                    aria-hidden="true"
                  />
                )}
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[#244b3b]/10 bg-white px-2 py-1 text-[10px] leading-4 text-[#50554d] dark:border-white/10 dark:bg-[#222421] dark:text-[#e6e3dc]">
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#eae5d9] text-[9px] font-semibold text-[#65685f] dark:bg-[#383a35] dark:text-[#e4dfd3]">
                    {number}
                  </span>
                  <span className="break-words">{node.label}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-2 text-[10px] leading-4 text-[#85867f] dark:text-[#a6a59e]">
            These are database-recorded process labels, not added instructions
            or confirmed causes.
          </p>

          {processNodes.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllProcesses((current) => !current)}
              className="mt-2 text-[10px] font-semibold text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {showAllProcesses ? "Show less" : "Show all"}
            </button>
          )}
        </section>
      )}

      {visibleEdges.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6c4d]">
            Recipe links and possible clues
          </h4>
          <ul className="mt-2 space-y-2">
            {visibleEdges.map((edge, index) => {
              const sourceNode = nodesById.get(edge.source_id);
              const targetNode = nodesById.get(edge.target_id);
              const isPossibleClue =
                edge.kind === "AFFECTS" && edge.active === true;
              const check = edge.rule_id
                ? checks.find((item) => item.rule_id === edge.rule_id)
                : null;
              const hypothesis = edge.rule_id
                ? (diagnosis?.hypotheses ?? []).find(
                    (item) => item.rule_id === edge.rule_id,
                  )
                : null;
              const ruleTitle = check?.title ?? hypothesis?.title;
              const evidence = (edge.evidence_ids ?? [])
                .map((id) => evidenceById.get(id))
                .filter(Boolean);

              return (
                <li
                  key={`${edge.source_id}-${edge.target_id}-${edge.kind}-${index}`}
                  className={`rounded-xl border p-3 ${
                    isPossibleClue
                      ? "border-[#c94d3f]/35 bg-[#fff1ed] text-[#7d2c24] dark:border-[#e17b6e]/40 dark:bg-[#482723] dark:text-[#ffd5cd]"
                      : "border-[#244b3b]/10 bg-white text-[#50554d] dark:border-white/10 dark:bg-[#292b28] dark:text-[#e6e3dc]"
                  }`}
                >
                  <div className="grid min-w-0 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                    <TraceNode
                      node={sourceNode}
                      ingredient={ingredientByNodeId.get(sourceNode.id)}
                    />
                    <span className="flex items-center justify-center gap-1 text-[10px]">
                      <span>{edgeLabels[edge.kind] ?? "linked to"}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                    <TraceNode
                      node={targetNode}
                      ingredient={ingredientByNodeId.get(targetNode.id)}
                    />
                  </div>

                  {isPossibleClue && (
                    <div className="mt-2 text-[10px] leading-5">
                      <p className="font-semibold">Possible clue from a check</p>
                      {(ruleTitle || edge.rule_id) && (
                        <p>Check: {ruleTitle ?? edge.rule_id}</p>
                      )}
                      {evidence.map((item) => (
                        <p key={item.id}>{item.text}</p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-[#244b3b]/10 bg-[#faf9f6] p-3 text-[11px] leading-5 text-[#65685f] dark:border-white/10 dark:bg-[#292b28] dark:text-[#c6c4bd]">
          No directional links were returned for these recipe details. That
          doesn’t mean the ingredients and steps are unrelated.
        </p>
      )}

      {checks.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6c4d]">
            Check results
          </h4>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <CheckCard key={check.rule_id} check={check} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FaultTrace;