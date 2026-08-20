# Task 5-a — Species (Pokémon) module

**Agent:** full-stack-developer (Species module)
**Date:** 2026-08-20

## Task

Build the Species (Pokémon) module for PokeForge: a list/grid view + a full editor
with 7 tabs (Identity, Base Stats, Types & Abilities, Graphics, Learnset, Evolutions,
Flags) + validation + code preview + safe/force delete.

## Files created

- `src/components/modules/species/species-view.tsx` — grid of cards (sprite/placeholder,
  name, constant, type badges, 6-stat bar summary, BST/height/weight), search filter,
  "New Pokémon" button, hover Edit/Delete actions, safe/force delete ConfirmDialog.
- `src/components/modules/species/species-editor.tsx` — large editor inside a wide
  right-side Sheet with sticky footer. 7 tabs, validation, code preview dialog.

## Files fixed (pre-existing blockers — needed to make the `/` route render at all)

- `src/components/app/sidebar.tsx` — replaced non-existent `PackageExport` lucide icon
  with `Package`.
- `src/components/modules/export/export-view.tsx` — same `PackageExport` → `Package`
  fix + fixed `"="..repeat(70)` typo → `"=".repeat(70)`.
- `src/app/globals.css` — renamed invalid `.type-???` CSS class to `.type-mystery`
  (the `?` characters broke Tailwind CSS parsing for the whole stylesheet).

## Key decisions

1. **Form state shape mirrors the API payload.** A single `useState<SpeciesFormState>`
   holds arrays directly (not JSON strings) — the POST/PATCH routes already convert
   `types`/`eggGroups`/`abilities`/`flags` arrays to JSON internally.
2. **No `useEffect` for prop→state sync.** Instead the parent passes a `key` that
   changes when the target species changes or the editor reopens. This makes the
   component remount with fresh `useState` initialisers — the React 19 recommended
   pattern (avoids the `react-hooks/set-state-in-effect` lint error).
3. **Learnset move picker = Combobox (Popover + Command).** Built-ins list is curated
   (~200 common Gen-3+ moves) since `poke-constants.ts` ships no `BUILTIN_MOVES`
   export. Custom moves from `useEntities("moves")` are merged in a separate group.
4. **Code preview** uses `generateSpeciesCode(form, learnset, evolutions)` from
   `poke-codegen.ts` shown in a Dialog with a Copy-to-clipboard button.
5. **Validation** posts to `/api/validate` with `{ entityType: "species", data: form }`;
   errors render red, warnings amber, inline above the sticky footer.
6. **Graphics tab** shows auto-generated symbol names (`gMonFrontPic_<Pascal>`,
   `gMonPalette_<Pascal>`, etc.) as read-only hints, plus optional symbol-name
   overrides for advanced users. No file upload (out of scope).
7. **Sprite placeholder** = `PokeballIcon` inside a circle tinted with the primary
   type color via inline `backgroundColor: ${color}15` (alpha hex).
8. **Delete** uses `ConfirmDialog` with `showDeleteMode` → safe (default) or force.
9. **Theme:** emerald primary + amber accent (matches globals.css), no indigo/blue.

## API contract verified

- `GET /api/species?projectId=…` → `{ species: SpeciesWithNested[] }` with nested
  `learnsetMoves` and `evolutions`. JSON-string fields: `types`, `eggGroups`,
  `abilities`, `flags` — parsed defensively with `JSON.parse` + try/catch.
- `POST /api/species` accepts arrays for those 4 fields (route stringifies them).
- `PATCH /api/species/[id]` same; `learnsetMoves`/`evolutions` arrays REPLACE existing.
- `DELETE /api/species/[id]?mode=safe|force` — safe blocks if other species evolve
  into this one; the editor surfaces a toast suggesting force-delete in that case.

## Lint status

Both species files pass ESLint cleanly (no errors, no warnings). The only remaining
lint error in the repo is pre-existing in `src/app/page.tsx:23` (`setMounted(true)`
in `useEffect` — standard Next.js hydration pattern), unrelated to this task.

## Dev server status

Page compiles and serves HTTP 200. Dashboard renders and queries the DB. Navigating
to the Pokémon tab compiles the species view on demand.
