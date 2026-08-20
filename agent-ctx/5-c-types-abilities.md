# Task 5-c — Types + Abilities modules

Agent: full-stack-developer (Types + Abilities modules)
Task ID: 5-c

## Summary

Built four files under `src/components/modules/`:

- `types/types-view.tsx` — `TypesView`: grid of custom-type cards + visual type-chart matrix
- `types/type-editor.tsx`  — `TypeEditor` (Sheet): identity, appearance, effectiveness-matrix editor, validate, preview, save
- `abilities/abilities-view.tsx` — `AbilitiesView`: list of ability cards + builtin abilities panel
- `abilities/ability-editor.tsx` — `AbilityEditor` (Sheet): identity, effect flags tag input, battle script, validate, preview, save

## Patterns used

- React 19 key-remount pattern: parent passes `key={editing?.id ?? "new"}` so editor remounts whenever the target changes — eliminates `setState-in-effect` lint errors that plague sibling modules.
- TanStack Query dedupes the `["project", projectId]` query shared between View and Editor.
- JSON matrices parsed on read (`safeParse`), serialized back to plain objects on save (API expects objects).
- Effectiveness matrix editor: sticky header (z-20) + sticky first column (z-10) + sticky corner (z-30), color-coded Selects (emerald for SE, amber for NVE, red for 0×).
- Type chart matrix centerpiece: scrollable table with sticky column headers (vertical type name badges), color-coded cells (4×/2× emerald, 1× muted, ½/¼ amber, 0× dark red), legend bar.
- Emerald/amber theme throughout (no indigo/blue in component-defined colors).
- ConfirmDialog with `showDeleteMode` for both entities; toast feedback via sonner.
- Code preview via Dialog with Copy button — uses `generateTypeCode` / `generateAbilityCode` from poke-codegen.

## Lint status

All four files lint clean (0 errors, 0 warnings). Remaining lint errors are in sibling modules owned by other agents (species, moves, items, statuses).
