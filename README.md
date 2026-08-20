Yes I used AI. That's cuz I cant code for shite. Anyways:

Prerequisites
Node.js 18+
Bun
Git (to clone the repo obviously)

Quick Start:
1. Clone the repo: git clone https://github.com/quackscarfmc-eng/PokeForge

2. Install dependencies

Open cmd in cloned repo and: bun install

3. Create the database

bun run db:push

4. Seed demo data (optional but recommended — creates a demo project
    with 2 Pokémon, 1 move, 1 type, 1 ability, 1 item, 1 status,
    5 wild encounters, and 2 trainers)
bun run scripts/seed.ts

5. Start the dev server
bun run dev

6. Open http://localhost:3000 in your browser

7. Do whatever really. See if it works, most likely won't. Can't stop me tho!
