# Task ID: 5-b — Moves Module (PokeForge)

**Agent:** full-stack-developer

## Goal
Build the Moves module: `MovesView` (list/table + search + new button + safe/force delete) and `MoveEditor` (right-side Sheet form with effect/type/category/target/flags + validate + code preview).

## Inputs / API contract
- `GET  /api/moves?projectId=...` → `{ moves: Move[] }` (flags is JSON string).
- `POST /api/moves` → body includes `projectId`, `constantName`, `moveId?`, `name`, `description?`, `effect`, `power`, `type`, `category`, `target`, `pp`, `accuracy`, `priority`, `critStage`, `flags: string[]`, `battleScript?`.
- `PATCH /api/moves/[id]` → partial fields; `flags` as array replaces.
- `DELETE /api/moves/[id]?mode=safe|force` — `safe` blocks if move is referenced in any learnset.

## Files to create
- `src/components/modules/moves/moves-view.tsx` — default export `MovesView`.
- `src/components/modules/moves/move-editor.tsx` — named export `MoveEditor`.

## Patterns followed
- `useEntities<Move>("moves")` from `entity-hooks.ts` returns `{ moves: Move[] }`.
- `useCreateEntity<Move>("moves")`, `useUpdateEntity<Move>("moves")`, `useDeleteEntity("moves")`.
- `useValidate()` posts `{ entityType: "move", data }`.
- `PageHeader`, `EmptyState`, `StatPill` from `page-header.tsx`.
- `TypeBadge` from `type-badge.tsx`.
- `ConfirmDialog` with `showDeleteMode` from `confirm-dialog.tsx`.
- `generateMoveCode`, `validateMove` from `poke-codegen.ts`.
- Constants: `POKEMON_TYPES`, `MOVE_EFFECTS`, `MOVE_CATEGORIES`, `MOVE_TARGETS`, `MOVE_FLAGS` from `poke-constants.ts`.
- Theme: emerald/amber (no indigo/blue). Use existing shadcn/ui components only.
- Category icons: `Sword` (physical), `Zap` (special), `Sparkles` (status) with type-color background.

## Decisions
- Form state: single `useState<MoveFormState>` object. When editing, parse `flags` JSON to array.
- Custom types pulled from `useEntities("types")` and merged with `POKEMON_TYPES` so the type Select shows both built-in and custom type constants.
- `moveId` defaults from `project.nextMoveId` in create mode (project fetched via `useQuery`).
- `battleScript` defaults to `BattleScript_<Name>` when empty on save.
- Footer is sticky at bottom of sheet (sheet already provides `mt-auto` on `SheetFooter`).
- Validation results rendered as a list of errors (red) and warnings (amber) above the footer.
- Code preview is a `Dialog` containing `generateMoveCode(form)` in a `<pre>` with a Copy button (uses `navigator.clipboard.writeText`).
- The list view uses a CSS table on `md+` screens and stacked cards on mobile for responsiveness.

## Progress
- [x] Read context
- [x] Build move-editor.tsx
- [x] Build moves-view.tsx
- [ ] Lint
- [ ] Worklog append
