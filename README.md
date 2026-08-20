# PokeForge — Custom Pokémon Editor for pokeemerald-expansion

A desktop GUI application for adding fully custom Pokémon, moves, types, abilities,
items, and status conditions to a `pokeemerald-expansion` ROM-hack codebase —
with validation, dry-run change plans, backups, and build checks.

Built with **Next.js 16 + Electron** (desktop) or **browser** (web).

---

## Features

- **8 content types**: Pokémon (species), Moves, Types, Abilities, Items, Status Conditions, Wild Encounters, Trainers
- **Import existing project**: scan your pokeemerald-expansion checkout and auto-import all species, moves, types, and abilities from the C source files
- **Safety workflow**: Validate → Dry-Run Plan → Apply (with auto-backup) → Build Check
- **15 views**: Dashboard, 8 content editors, Evolution Chains, Comparer, Type Calculator, Safety Center, Export, Settings
- **Global search** (⌘K), theme toggle (light/dark), mobile responsive, keyboard shortcuts
- **Code export**: generates C-header snippets + JSON to paste into your project
- **Bulk JSON import** for species and moves
- **Duplicate** action on all 6 entity types
- **Sprite upload** with live stat radar charts
- **Evolution chain** tree visualizer
- **Pokémon comparer** for side-by-side balancing
- **Type calculator** for battle effectiveness

---

## Quick Start (Desktop GUI — recommended)

### Prerequisites

- **Node.js 18+** (v24 recommended)
- **Bun** — install with `curl -fsSL https://bun.sh/install | bash`
- **Linux**: `libgtk-3-0`, `libnotify4`, `libnss3`, `libxss1`, `libxtst6`, `xdg-utils`, `libatspi2.0-0`, `libuuid1` (for Electron)

### Development mode

```bash
# 1. Install dependencies
bun install

# 2. Create the database
bun run db:push

# 3. Seed demo data (optional)
bun run seed

# 4. Start the Next.js dev server (in a terminal)
bun run dev

# 5. In ANOTHER terminal, launch the Electron desktop window
bun run electron:dev
```

This opens a native desktop window that loads the app from `http://localhost:3000`.

### Production build (Linux AppImage / deb)

```bash
# Build the Next.js app + compile Electron + package as AppImage/deb/tar.gz
bun run electron:build
```

Output: `dist-electron/PokeForge-1.0.0.AppImage` (or `.deb`)

Run the AppImage:
```bash
chmod +x dist-electron/PokeForge-1.0.0.AppImage
./dist-electron/PokeForge-1.0.0.AppImage
```

### Cross-platform builds

- **Linux**: `bun run electron:build` (AppImage + deb + tar.gz)
- **macOS**: `electron-builder --mac` (requires macOS)
- **Windows**: `electron-builder --win` (requires Windows)

---

## Quick Start (Web UI — alternative)

If you prefer the browser:

```bash
bun install
bun run db:push
bun run seed
bun run dev
# Open http://localhost:3000
```

---

## Importing an Existing pokeemerald-expansion Project

1. Open the app (desktop or web)
2. Go to the **Dashboard**
3. Click **"Import Project"**
4. Enter the path to your pokeemerald-expansion git checkout (the folder containing `include/` and `src/`)
5. Click **Scan** — the app validates the path and counts species, moves, types, abilities
6. Click **Import** — all entities are imported into the database with their real stats

The parser reads:
- `include/constants/species.h` + `src/data/pokemon/species_info.h` → species with base stats, types, abilities, growth rate, egg groups, gender ratio, body color
- `include/constants/moves.h` + `src/data/battle_moves.h` → moves with power, type, accuracy, PP, effect, category, target
- `include/constants/types.h` → type constants
- `include/constants/abilities.h` → ability constants

---

## Desktop Menu Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1/2/3` | Dashboard / Pokémon / Moves |
| `Ctrl+I` | Import existing project |
| `Ctrl+B` | Run build check |
| `Ctrl+Shift+B` | Create backup |
| `Ctrl+N` | New project |
| `⌘K` | Command palette / global search |

---

## Project Structure

```
pokeforge/
├── electron/              # Electron desktop shell
│   ├── main.ts            # Main process (window, menus, server spawning)
│   └── preload.ts         # Preload script (IPC bridge)
├── src/
│   ├── app/
│   │   ├── api/            # REST API routes (22+)
│   │   ├── page.tsx       # SPA shell (15 views)
│   │   └── globals.css    # Theme + animations
│   ├── components/
│   │   ├── app/           # Sidebar, topbar, command palette
│   │   ├── modules/       # 15 view components
│   │   └── shared/        # Reusable components
│   ├── lib/
│   │   ├── poke-codegen.ts      # C-code generators + validators
│   │   ├── poke-constants.ts    # Canonical Pokémon data
│   │   ├── pokeemerald-parser.ts # Source file parser
│   │   └── store.ts       # Zustand state
│   └── hooks/
│       └── use-desktop-integration.ts # Electron IPC hook
├── prisma/
│   └── schema.prisma      # Database schema (12 models)
├── scripts/
│   └── seed.ts            # Demo data seeder
└── package.json           # Electron + Next.js scripts
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Desktop**: Electron 43 + electron-builder
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM + SQLite
- **State**: Zustand + TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide

---

