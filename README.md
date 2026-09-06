# Logic Engine

An interactive propositional logic tutor. Type a formula and it's parsed, evaluated, and shown four different ways at once: as a 3D logic circuit, a full truth table, a plain-English translation, and a step-by-step trace explaining why each sub-expression is true or false.

## What it does

- **Formula input** supporting both plain-text and LaTeX-style operators: `^`, `&`, `\land` (AND); `v`, `|`, `\lor` (OR); `~`, `!`, `\neg` (NOT); `->`, `=>`, `\to` (IMPLIES); `<->`, `<=>`, `\leftrightarrow` (IFF).
- A hand-written recursive-descent parser turns the formula into an AST — there's no parsing library involved.
- **3D circuit view**: each operator becomes a gate, each sub-expression a wire, colored by its current truth value, camera auto-framed to fit the whole tree.
- **Truth table**: every row for the formula's variables (capped at 8, to avoid freezing on large inputs), with the row matching the current toggle state highlighted.
- **Interactive trace**: a nested, hoverable breakdown of the AST that explains in plain English why each sub-expression evaluates to true or false.
- **Real-world translation**: turns the formula into an English sentence, using a small sample vocabulary (P/Q/R/S/T map to a rain/umbrella scenario; other variables read generically).

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, `@react-three/fiber` / `drei` / `three` for the 3D circuit, Motion for the animated truth-table row highlighting.

## Project structure

- `src/logic.ts` — the parser, evaluator, truth-table generation, and English translation. No UI or 3D dependencies, so the logic can be read (or tested) on its own.
- `src/Circuit.tsx` — the 3D circuit layout and rendering.
- `src/TraceNode.tsx` — the interactive trace panel.
- `src/App.tsx` — top-level layout that wires the above together.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`
3. Open `http://localhost:3000`

## What this demonstrates

- A hand-rolled recursive-descent parser and tree-walking evaluator for a small formal grammar, built without a parsing library.
- Using a 3D rendering library (react-three-fiber) to visualize a symbolic, non-spatial structure (a logic circuit) rather than a physical scene.
- Keeping several different views (3D scene, truth table, trace panel, translation) in sync from one shared evaluation of the AST, rather than duplicating logic per view.
- Handling real edge cases directly in the parser and UI: invalid formulas, empty input, and a variable-count limit to avoid combinatorial blow-up in the truth table.
