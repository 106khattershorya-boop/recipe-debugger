# Recipe Debugger

Recipe Debugger helps diagnose why a recipe did not turn out as expected. It represents recipes as steps and ingredients, uses explicit rules to generate possible causes, and presents evidence, uncertainty, suggested changes, and directional “what if” estimates.

The language model may help parse or explain information, but it cannot introduce a diagnosis that the rule engine did not propose.

## Project scope

The initial demo focuses on two recipe families:

- Fried milk dough sweets, including gulab jamun
- Baked cakes

Recipes outside those families may receive a low-evidence result.

### Data sources

- **RecipeDB:** planned for recipe-family references and available ingredient, quantity, state, and cooking-process data.
- **FlavorDB:** planned for ingredient identity, synonyms, categories, and flavor profiles.
- **CocktailDB:** excluded from this project.

API authentication, endpoints, response formats, access limits, and relevant fields must be verified against the documentation and live API access available to the team before we rely on them. Until then, integrations are unverified.

Ingredient functional roles and diagnosis rules are application knowledge. They must be labelled with their source or as a team heuristic; they are not presented as fields supplied by RecipeDB or FlavorDB.

## Technology

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Python, FastAPI
- Database: MongoDB
- AI: an LLM API with structured outputs and application-side validation

## Planned diagnosis flow

1. Parse and validate the submitted recipe.
2. Normalize quantities and identify missing details.
3. Build a recipe dependency graph.
4. Apply explicit rules to generate candidate causes.
5. Rank candidates and show evidence and uncertainty.
6. Ask a targeted follow-up when important information is missing.
7. Estimate how proposed changes affect symptom risks and trade-offs.
8. Show a repaired recipe with a reason for each change.

Counterfactual results are directional model estimates, not cooking results or validated predictions. Confirmed user outcomes may be collected, but they will not automatically change diagnosis rules.

## Development milestones

1. Project setup and data-source access checks
2. Backend foundation and recipe schemas
3. Deterministic diagnosis engine and evidence model
4. Counterfactual estimates and repair diff
5. Verified RecipeDB and FlavorDB integrations
6. Frontend diagnosis flow and Fault Trace
7. Integration, evaluation, and demo preparation

The MVP is planned for the 24-hour Foodoscope ForkIT Challenge 2026. If selected, the project should be ready for presentation at GastroSym 2026 on December 12, 2026.

## Current status

Project setup has started. RecipeDB and FlavorDB API details still need verification before implementation depends on them.