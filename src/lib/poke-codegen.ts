// PokeForge — code generators for pokeemerald-expansion
// Produces C-header / JSON snippets that the user copies into their project,
// plus the full change-plan markdown.

import {
  POKEMON_TYPES,
  MOVE_EFFECTS,
  MOVE_CATEGORIES,
  MOVE_TARGETS,
  GROWTH_RATES,
  EGG_GROUPS,
  BODY_COLORS,
  CRY_IDS,
  FRONT_ANIM_IDS,
  BACK_ANIM_IDS,
} from "@/lib/poke-constants";

// ---------------------------------------------------------------------------
// Types (mirror of Prisma models, but plain for use in both client & server)
// ---------------------------------------------------------------------------
export interface SpeciesData {
  constantName: string;
  speciesId: number;
  speciesName: string;
  nationalDexNum?: number | null;
  hoennDexNum?: number | null;
  categoryName?: string | null;
  description?: string | null;
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseSpAttack: number;
  baseSpDefense: number;
  evYieldHP: number;
  evYieldAttack: number;
  evYieldDefense: number;
  evYieldSpeed: number;
  evYieldSpAttack: number;
  evYieldSpDefense: number;
  types: string[]; // TYPE_*
  catchRate: number;
  expYield: number;
  genderRatio: number;
  eggCycles: number;
  friendship: number;
  growthRate: string;
  eggGroups: string[];
  abilities: string[];
  bodyColor: string;
  noFlip: boolean;
  height: number;
  weight: number;
  frontPicSymbol?: string | null;
  backPicSymbol?: string | null;
  iconSymbol?: string | null;
  footprintSymbol?: string | null;
  paletteSymbol?: string | null;
  shinyPaletteSymbol?: string | null;
  frontAnimId: string;
  backAnimId: string;
  frontPicWidth: number;
  frontPicHeight: number;
  backPicWidth: number;
  backPicHeight: number;
  cryId: string;
  flags: string[];
}

export interface MoveData {
  constantName: string;
  moveId: number;
  name: string;
  description?: string | null;
  effect: string;
  power: number;
  type: string;
  category: string;
  target: string;
  pp: number;
  accuracy: number;
  priority: number;
  critStage: number;
  flags: string[];
  battleScript?: string | null;
}

export interface TypeData {
  constantName: string;
  typeId: number;
  name: string;
  description?: string | null;
  colorHex: string;
  offensiveMatrix: Record<string, number>;
  defensiveMatrix: Record<string, number>;
}

export interface AbilityData {
  constantName: string;
  abilityId: number;
  name: string;
  description?: string | null;
  effectFlags: string[];
  battleScript?: string | null;
}

export interface ItemData {
  constantName: string;
  itemId: number;
  name: string;
  description?: string | null;
  pocket: string;
  price: number;
  effect: string;
  holdEffect: string;
  flingPower: number;
  importance: number;
  category: string;
  isTM: boolean;
  tmMoveConstant?: string | null;
}

export interface StatusData {
  constantName: string;
  statusId: number;
  name: string;
  description?: string | null;
  category: string;
  isVolatile: boolean;
  battleScript?: string | null;
  colorHex: string;
  iconEmoji?: string | null;
}

export interface LevelUpMoveData {
  level: number;
  moveConstant: string;
}

export interface EvolutionData {
  method: string;
  param: string;
  targetSpecies: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^(.)(.*)$/, (_, a, b) => a.toUpperCase() + b);
}

function toPascalCase(s: string): string {
  return s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function constantToFolder(constant: string): string {
  // SPECIES_MY_COOL_MON -> my_cool_mon
  return constant.replace(/^SPECIES_/, "").toLowerCase();
}

function compoundString(text: string, perLine = 22): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > perLine) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.map((l) => `_${(`"${l}\\n"`).padEnd(2)}`).join("\n    ");
}

// ---------------------------------------------------------------------------
// Species code generator
// ---------------------------------------------------------------------------
export function generateSpeciesCode(
  s: SpeciesData,
  learnset: LevelUpMoveData[] = [],
  evolutions: EvolutionData[] = [],
): string {
  const folder = constantToFolder(s.constantName);
  const symbol = "gMonFrontPic_" + toPascalCase(s.constantName.replace("SPECIES_", ""));
  const backSymbol = "gMonBackPic_" + toPascalCase(s.constantName.replace("SPECIES_", ""));
  const paletteSymbol = "gMonPalette_" + toPascalCase(s.constantName.replace("SPECIES_", ""));
  const shinySymbol = "gMonShinyPalette_" + toPascalCase(s.constantName.replace("SPECIES_", ""));
  const iconSymbol = "gMonIcon_" + toPascalCase(s.constantName.replace("SPECIES_", ""));
  const footprintMacro = "FOOTPRINT(" + toPascalCase(s.constantName.replace("SPECIES_", "")) + ")";
  const learnsetSymbol = "s" + toPascalCase(s.constantName.replace("SPECIES_", "")) + "LevelUpLearnset";
  const teachableSymbol = "s" + toPascalCase(s.constantName.replace("SPECIES_", "")) + "TeachableLearnset";

  const types = s.types.length === 1 ? [...s.types, "TYPE_NONE"] : s.types.slice(0, 2);
  const eggGroups = s.eggGroups.length === 1 ? [...s.eggGroups, "EGG_GROUP_NONE"] : s.eggGroups.slice(0, 2);
  const abilities =
    s.abilities.length >= 3 ? s.abilities.slice(0, 3) : [...s.abilities, ...Array(3 - s.abilities.length).fill("ABILITY_NONE")];

  const descLines = (s.description || "A mysterious creature.")
    .split("\n")
    .map((l) => `    _("${l.replace(/"/g, '\\"')}\\n")`)
    .join("\n");

  const learnsetStr = learnset.length
    ? learnset.map((l) => `    LEVEL_UP_MOVE(${l.level}, ${l.moveConstant}),`).join("\n")
    : "    LEVEL_UP_MOVE(1, MOVE_TACKLE),";

  const evoStr = evolutions.length
    ? evolutions
        .map(
          (e) =>
            `    EVOLUTION({${e.method}, ${e.param}, ${e.targetSpecies}}),`,
        )
        .join("\n")
    : `    EVOLUTION({EVO_NONE}),`;

  const flagsStr = s.flags.length
    ? s.flags.map((f) => `    .${f} = TRUE,`).join("\n")
    : "";

  return `// ============================================================
// ${s.constantName} (${s.speciesName})
// Generated by PokeForge — paste into your pokeemerald-expansion project
// ============================================================

// ---- 1. include/constants/species.h (append after last species) ----
#define ${s.constantName} ${s.speciesId}

// ---- 2. include/constants/pokedex.h (if using Pokédex) ----
${s.nationalDexNum ? `#define NATIONAL_DEX_${s.constantName.replace("SPECIES_", "")} ${s.nationalDexNum}` : "// (no national dex)"}
${s.hoennDexNum ? `#define HOENN_DEX_${s.constantName.replace("SPECIES_", "")} ${s.hoennDexNum}` : "// (no hoenn dex)"}

// ---- 3. src/data/pokemon/species_info.h (gSpeciesInfo[] entry) ----
[${s.constantName}] =
{
    .baseHP = ${s.baseHP},
    .baseAttack = ${s.baseAttack},
    .baseDefense = ${s.baseDefense},
    .baseSpeed = ${s.baseSpeed},
    .baseSpAttack = ${s.baseSpAttack},
    .baseSpDefense = ${s.baseSpDefense},
    .types = MON_TYPES(${types[0]}, ${types[1]}),
    .catchRate = ${s.catchRate},
    .expYield = ${s.expYield},
    .evYield_HP = ${s.evYieldHP},
    .evYield_Attack = ${s.evYieldAttack},
    .evYield_Defense = ${s.evYieldDefense},
    .evYield_Speed = ${s.evYieldSpeed},
    .evYield_SpAttack = ${s.evYieldSpAttack},
    .evYield_SpDefense = ${s.evYieldSpDefense},
    .genderRatio = PERCENT_FEMALE(${Math.round((254 - s.genderRatio) * 100 / 254)}),
    .eggCycles = ${s.eggCycles},
    .friendship = ${s.friendship},
    .growthRate = ${s.growthRate},
    .eggGroups = MON_EGG_GROUPS(${eggGroups[0]}, ${eggGroups[1]}),
    .abilities = {${abilities[0]}, ${abilities[1]}, ${abilities[2]}},
    .bodyColor = ${s.bodyColor},
    .noFlip = ${s.noFlip ? "TRUE" : "FALSE"},

    // Graphics
    .frontPic = ${s.frontPicSymbol || symbol},
    .frontPicSize = MON_COORDS_SIZE(${s.frontPicWidth}, ${s.frontPicHeight}),
    .frontPicYOffset = 0,
    .frontAnimFrames = ANIM_FRAMES(ANIMCMD_FRAME(0, 1)),
    .frontAnimId = ${s.frontAnimId},
    .frontAnimDelay = 10,
    .enemyMonElevation = 0,
    .backPic = ${s.backPicSymbol || backSymbol},
    .backPicSize = MON_COORDS_SIZE(${s.backPicWidth}, ${s.backPicHeight}),
    .backPicYOffset = 0,
    .backAnimId = ${s.backAnimId},
    .palette = ${s.paletteSymbol || paletteSymbol},
    .shinyPalette = ${s.shinyPaletteSymbol || shinySymbol},
    .iconSprite = ${s.iconSymbol || iconSymbol},
    .iconPalIndex = 1,
    ${footprintMacro},

    // Species metadata
    .speciesName = _("${s.speciesName}"),
    .cryId = ${s.cryId},
    .categoryName = _("${s.categoryName || "Pokémon"}"),
    .height = ${s.height},
    .weight = ${s.weight},
    .description = COMPOUND_STRING(
${descLines}
    ),
    .pokemonScale = 256,
    .pokemonOffset = 0,
    .trainerScale = 256,
    .trainerOffset = 0,
${flagsStr ? flagsStr + "\n" : ""}
    // Learnsets
    .levelUpLearnset = ${learnsetSymbol},
    .teachableLearnset = ${teachableSymbol},
    .evolutions = ${evoStr},
},

// ---- 4. src/data/graphics/pokemon.h (register graphics) ----
const u32 ${s.frontPicSymbol || symbol}[] = INCGFX_U32("graphics/pokemon/${folder}/anim_front.png", ".4bpp.lz");
const u32 ${s.backPicSymbol || backSymbol}[] = INCGFX_U32("graphics/pokemon/${folder}/back.png", ".4bpp.lz");
const u16 ${s.paletteSymbol || paletteSymbol}[] = INCGFX_U16("graphics/pokemon/${folder}/normal.pal", ".gbapal");
const u16 ${s.shinyPaletteSymbol || shinySymbol}[] = INCGFX_U16("graphics/pokemon/${folder}/shiny.pal", ".gbapal");
const u8 ${s.iconSymbol || iconSymbol}[] = INCGFX_U8("graphics/pokemon/${folder}/icon.png", ".4bpp");
const u8 gMonFootprint_${toPascalCase(s.constantName.replace("SPECIES_", ""))}[] = INCGFX_U8("graphics/pokemon/${folder}/footprint.png", ".1bpp");

// ---- 5. src/data/pokemon/level_up_learnsets/gen_9.h ----
static const struct LevelUpMove ${learnsetSymbol}[] = {
${learnsetStr}
    LEVEL_UP_MOVE(0, MOVE_UNAVAILABLE),
};

// ---- 6. src/data/pokemon/teachable_learnsets.h ----
static const u16 ${teachableSymbol}[] = {
    MOVE_TACKLE, // TODO: add TM/HM/tutor moves
    MOVE_UNAVAILABLE,
};

// ---- 7. src/data/pokemon/pokedex_orders.h ----
// (insert ${s.nationalDexNum ? `NATIONAL_DEX_${s.constantName.replace("SPECIES_", "")}` : "// —"} in alphabetical/weight/height arrays)

// ---- 8. graphics/pokemon/${folder}/ (asset folder) ----
// Required files: anim_front.png, back.png, normal.pal, shiny.pal, icon.png, footprint.png
`;
}

// ---------------------------------------------------------------------------
// Move code generator
// ---------------------------------------------------------------------------
export function generateMoveCode(m: MoveData): string {
  const flags = m.flags.length
    ? m.flags.join(" | ")
    : "MOVE_FLAG_MAKES_CONTACT";

  const desc = (m.description || "").replace(/"/g, '\\"');

  return `// ============================================================
// ${m.constantName} (${m.name})
// Generated by PokeForge
// ============================================================

// ---- 1. include/constants/moves.h ----
#define ${m.constantName} ${m.moveId}

// ---- 2. src/data/battle_moves.h (gBattleMoves[] entry) ----
[${m.constantName}] =
{
    .name = COMPOUND_STRING("${m.name}"),
    .description = COMPOUND_STRING(
        "${desc}"
    ),
    .effect = ${m.effect},
    .power = ${m.power},
    .type = ${m.type},
    .accuracy = ${m.accuracy},
    .pp = ${m.pp},
    .priority = ${m.priority},
    .category = ${m.category},
    .target = ${m.target},
    .critStage = ${m.critStage},
    .flags = ${flags},
},

// ---- 3. data/battle_scripts_1.s (battle script) ----
${m.battleScript || "BattleScript_" + m.constantName.replace("MOVE_", "") + "::"}
    attackcanceler
    accuracycheck BattleScript_MoveMissed, ${m.type}
    attackstring
    ppreduce
    critcalc
    damagecalc
    typecalc
    adjustdamage
    attackanimation
    waitmessage B_WAIT_TIME_LONG
    tryfaintmon
    movesequence
    end2
BattleScript_MoveMissed::
    attackstring
    ppreduce
    pause B_WAIT_TIME_LONG
    end2

// ---- 4. include/battle_scripts.h (declare the label) ----
extern const u8 BattleScript_${toPascalCase(m.constantName.replace("MOVE_", ""))}[];
`;
}

// ---------------------------------------------------------------------------
// Type code generator
// ---------------------------------------------------------------------------
export function generateTypeCode(t: TypeData, allTypes: string[]): string {
  const offensiveRows = allTypes
    .map((def) => `    [TYPE_${t.constantName.replace("TYPE_", "")}][${def}] = ${t.offensiveMatrix[def] ?? 1},`)
    .join("\n");
  const defensiveRows = allTypes
    .map((atk) => `    [${atk}][TYPE_${t.constantName.replace("TYPE_", "")}] = ${t.defensiveMatrix[atk] ?? 1},`)
    .join("\n");

  return `// ============================================================
// ${t.constantName} (${t.name})
// Generated by PokeForge
// ============================================================

// ---- 1. include/constants/types.h ----
#define ${t.constantName} ${t.typeId}
#define NUMBER_OF_TYPES (${t.typeId} + 1)

// ---- 2. src/data/type_effectiveness.h (extend chart) ----
// Offensive row (what ${t.name} deals to other types):
${offensiveRows}

// Defensive column (what ${t.name} takes from other types):
${defensiveRows}

// ---- 3. (Optional) Update display name in src/data/types.c ----
// gTypeNames[TYPE_${t.constantName.replace("TYPE_", "")}] = COMPOUND_STRING("${t.name}");

// ---- 4. (Optional) Add type icon + battle animation ----
// See data/battle_anim_scripts.s and graphics/types/
`;
}

// ---------------------------------------------------------------------------
// Ability code generator
// ---------------------------------------------------------------------------
export function generateAbilityCode(a: AbilityData): string {
  const desc = (a.description || "").replace(/"/g, '\\"');
  return `// ============================================================
// ${a.constantName} (${a.name})
// Generated by PokeForge
// ============================================================

// ---- 1. include/constants/abilities.h ----
#define ${a.constantName} ${a.abilityId}
#define ABILITIES_COUNT (${a.abilityId} + 1)

// ---- 2. src/data/text/abilities.h (name + description) ----
[${a.constantName}] =
{
    .name = COMPOUND_STRING("${a.name}"),
    .description = COMPOUND_STRING(
        "${desc}"
    ),
},

// ---- 3. Battle logic (add to src/data/battle_scripts/ and battle_*.c) ----
${a.battleScript || "// TODO: implement " + a.name + " behavior in battle_main.c or battle_abilities.c"}

// ---- 4. Effect flags ----
${a.effectFlags.length ? a.effectFlags.map((f) => `// ${f}`).join("\n") : "// (no flags)"}

// ---- 5. include/constants/ability_constants.h (if needed) ----
// extern const u16 ${a.constantName.replace("ABILITY_", "")}_AbilityFlag;
`;
}

// ---------------------------------------------------------------------------
// Item code generator
// ---------------------------------------------------------------------------
export function generateItemCode(i: ItemData): string {
  const desc = (i.description || "").replace(/"/g, '\\"');
  return `// ============================================================
// ${i.constantName} (${i.name})
// Generated by PokeForge
// ============================================================

// ---- 1. include/constants/items.h ----
#define ${i.constantName} ${i.itemId}
#define ITEMS_COUNT (${i.itemId} + 1)

// ---- 2. src/data/items.h (gItems[] entry) ----
[${i.constantName}] =
{
    .name = COMPOUND_STRING("${i.name}"),
    .itemId = ${i.itemId},
    .price = ${i.price},
    .pocket = ${i.pocket},
    .type = ${i.effect},
    .fieldUseFunc = ItemFieldUse_${i.effect},
    .battleUsage = ${i.isTM ? "ITEM_BATTLE_USAGE_TM" : "0"},
    .battleUseFunc = ItemBattleUse_${i.effect},
    .secondaryId = 0,
    .holdEffect = ${i.holdEffect},
    .flingPower = ${i.flingPower},
    .importance = ${i.importance},
    .description = COMPOUND_STRING(
        "${desc}"
    ),
},

// ---- 3. TM/HM linkage (if TM) ----
${i.isTM ? `// TM learns move: ${i.tmMoveConstant}` : "// (not a TM)"}

// ---- 4. graphics/items/${i.constantName.toLowerCase().replace("item_", "")}.png ----
// (place icon here, register via src/data/graphics/items.h with INCGFX_U8)
`;
}

// ---------------------------------------------------------------------------
// Status condition code generator
// ---------------------------------------------------------------------------
export function generateStatusCode(s: StatusData): string {
  const desc = (s.description || "").replace(/"/g, '\\"');
  return `// ============================================================
// ${s.constantName} (${s.name})
// Generated by PokeForge
// ============================================================

// ---- 1. include/constants/battle.h ----
#define ${s.constantName} ${s.statusId}

// ---- 2. (if non-volatile) extend STATUS1/STATUS2 bitmasks ----
${s.isVolatile ? "// volatile status: add to STATUS2_*" : "// non-volatile status: add to STATUS1_*"}

// ---- 3. Battle scripts (data/battle_scripts_1.s) ----
${s.battleScript || `BattleScript_${s.constantName}Apply::\n    // TODO: implement ${s.name} tick-down / effect\n    end2`}

// ---- 4. Battle logic ----
// Update src/battle_util.c, src/battle_script_commands.c to handle ${s.name}.
// Add icon/animation in data/battle_anim_scripts.s.

// ---- 5. Description text ----
const u8 ${s.constantName}_Description[] = _("${desc}");
`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

export function validateConstantName(name: string, prefix: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!name.startsWith(prefix))
    issues.push({ severity: "error", message: `Constant must start with "${prefix}"` });
  if (!/^[A-Z][A-Z0-9_]*$/.test(name))
    issues.push({ severity: "error", message: "Constant must be UPPER_SNAKE_CASE (A-Z, 0-9, _)" });
  if (name.length > 41)
    issues.push({ severity: "error", message: "Constant name must be ≤ 41 characters" });
  if (name.length < prefix.length + 2)
    issues.push({ severity: "warning", message: "Constant name is very short" });
  return issues;
}

export function validateSpecies(s: SpeciesData, knownTypes: string[], knownAbilities: string[], knownMoves: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(s.constantName, "SPECIES_"));

  if (s.speciesId < 0 || s.speciesId > 65535)
    issues.push({ severity: "error", message: "Species ID must be 0–65535" });

  const statBounds: [keyof SpeciesData, number, number][] = [
    ["baseHP", 1, 255], ["baseAttack", 1, 255], ["baseDefense", 1, 255],
    ["baseSpeed", 1, 255], ["baseSpAttack", 1, 255], ["baseSpDefense", 1, 255],
  ];
  for (const [k, lo, hi] of statBounds) {
    const v = s[k] as number;
    if (v < lo || v > hi)
      issues.push({ severity: "error", message: `${k} must be ${lo}–${hi}` });
  }
  if (s.catchRate < 0 || s.catchRate > 255) issues.push({ severity: "error", message: "Catch rate must be 0–255" });
  if (s.expYield < 0 || s.expYield > 255) issues.push({ severity: "error", message: "EXP yield must be 0–255" });
  if (s.genderRatio < 0 || s.genderRatio > 255) issues.push({ severity: "error", message: "Gender ratio must be 0–255" });
  if (s.eggCycles < 0 || s.eggCycles > 255) issues.push({ severity: "error", message: "Egg cycles must be 0–255" });
  if (s.friendship < 0 || s.friendship > 255) issues.push({ severity: "error", message: "Friendship must be 0–255" });

  if (s.types.length === 0) issues.push({ severity: "error", message: "Species must have at least 1 type" });
  if (s.types.length > 2) issues.push({ severity: "error", message: "Species can have at most 2 types" });
  for (const t of s.types) {
    if (!knownTypes.includes(t) && !POKEMON_TYPES.some((pt) => pt.constant === t))
      issues.push({ severity: "error", message: `Unknown type: ${t}` });
  }

  if (s.abilities.length === 0 || s.abilities.length > 3)
    issues.push({ severity: "error", message: "Species must have 1–3 abilities" });
  for (const a of s.abilities) {
    if (!knownAbilities.includes(a) && a !== "ABILITY_NONE")
      issues.push({ severity: "error", message: `Unknown ability: ${a}` });
  }

  if (!GROWTH_RATES.includes(s.growthRate)) issues.push({ severity: "error", message: `Unknown growth rate: ${s.growthRate}` });
  if (s.eggGroups.length === 0 || s.eggGroups.length > 2)
    issues.push({ severity: "error", message: "Must have 1–2 egg groups" });
  for (const eg of s.eggGroups) {
    if (!EGG_GROUPS.includes(eg))
      issues.push({ severity: "error", message: `Unknown egg group: ${eg}` });
  }
  if (!BODY_COLORS.includes(s.bodyColor)) issues.push({ severity: "error", message: `Unknown body color: ${s.bodyColor}` });
  if (!CRY_IDS.includes(s.cryId)) issues.push({ severity: "warning", message: `Cry ${s.cryId} not in known list (may still be valid)` });
  if (!FRONT_ANIM_IDS.includes(s.frontAnimId)) issues.push({ severity: "warning", message: `Unknown frontAnimId: ${s.frontAnimId}` });
  if (!BACK_ANIM_IDS.includes(s.backAnimId)) issues.push({ severity: "warning", message: `Unknown backAnimId: ${s.backAnimId}` });

  if (s.speciesName.length === 0) issues.push({ severity: "error", message: "Species name is required" });
  if (s.speciesName.length > 11) issues.push({ severity: "warning", message: "Species name > 11 chars may overflow battle UI" });
  if (s.height <= 0) issues.push({ severity: "warning", message: "Height should be > 0 (decimetres)" });
  if (s.weight <= 0) issues.push({ severity: "warning", message: "Weight should be > 0 (hectograms)" });

  if (!s.description || s.description.length < 10)
    issues.push({ severity: "warning", message: "Description is short or missing" });

  return issues;
}

export function validateMove(m: MoveData, knownTypes: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(m.constantName, "MOVE_"));
  if (m.moveId < 0 || m.moveId > 65535) issues.push({ severity: "error", message: "Move ID must be 0–65535" });
  if (m.power < 0 || m.power > 255) issues.push({ severity: "error", message: "Power must be 0–255" });
  if (m.accuracy < 0 || m.accuracy > 100) issues.push({ severity: "error", message: "Accuracy must be 0–100" });
  if (m.pp < 1 || m.pp > 40) issues.push({ severity: "warning", message: "PP is typically 1–40" });
  if (m.priority < -7 || m.priority > 5) issues.push({ severity: "error", message: "Priority must be -7…+5" });
  if (m.critStage < 0 || m.critStage > 24) issues.push({ severity: "error", message: "Crit stage must be 0–24" });

  if (!POKEMON_TYPES.some((t) => t.constant === m.type) && !knownTypes.includes(m.type))
    issues.push({ severity: "error", message: `Unknown type: ${m.type}` });
  if (!MOVE_EFFECTS.some((e) => e.constant === m.effect)) issues.push({ severity: "warning", message: `Effect ${m.effect} may be unknown` });
  if (!MOVE_CATEGORIES.some((c) => c.constant === m.category)) issues.push({ severity: "error", message: `Unknown category: ${m.category}` });
  if (!MOVE_TARGETS.some((t) => t.constant === m.target)) issues.push({ severity: "error", message: `Unknown target: ${m.target}` });

  if (!m.name) issues.push({ severity: "error", message: "Move name is required" });
  if (m.name.length > 12) issues.push({ severity: "warning", message: "Move name > 12 chars may overflow battle UI" });
  if (m.category === "CATEGORY_STATUS" && m.power !== 0) issues.push({ severity: "warning", message: "Status moves usually have power 0" });
  if (m.category !== "CATEGORY_STATUS" && m.power === 0) issues.push({ severity: "warning", message: "Damaging move with 0 power" });

  return issues;
}

export function validateType(t: TypeData, knownTypes: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(t.constantName, "TYPE_"));
  if (t.typeId < 0 || t.typeId > 255) issues.push({ severity: "error", message: "Type ID must be 0–255" });
  if (!t.name) issues.push({ severity: "error", message: "Type name is required" });

  const allTypes = [...POKEMON_TYPES.map((pt) => pt.constant), ...knownTypes];
  for (const [atk, mult] of Object.entries(t.offensiveMatrix)) {
    if (!allTypes.includes(atk) && atk !== t.constantName)
      issues.push({ severity: "warning", message: `Offensive matrix references unknown type: ${atk}` });
    if (![0, 0.25, 0.5, 1, 2, 4].includes(mult))
      issues.push({ severity: "warning", message: `Offensive mult for ${atk} is unusual: ${mult}` });
  }
  for (const [atk, mult] of Object.entries(t.defensiveMatrix)) {
    if (!allTypes.includes(atk) && atk !== t.constantName)
      issues.push({ severity: "warning", message: `Defensive matrix references unknown type: ${atk}` });
    if (![0, 0.25, 0.5, 1, 2, 4].includes(mult))
      issues.push({ severity: "warning", message: `Defensive mult for ${atk} is unusual: ${mult}` });
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(t.colorHex)) issues.push({ severity: "warning", message: "colorHex should be #RRGGBB" });
  return issues;
}

export function validateAbility(a: AbilityData, knownAbilities: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(a.constantName, "ABILITY_"));
  if (a.abilityId < 0 || a.abilityId > 65535) issues.push({ severity: "error", message: "Ability ID must be 0–65535" });
  if (!a.name) issues.push({ severity: "error", message: "Ability name is required" });
  if (!a.description || a.description.length < 5) issues.push({ severity: "warning", message: "Description is short/missing" });
  return issues;
}

export function validateItem(i: ItemData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(i.constantName, "ITEM_"));
  if (i.itemId < 0 || i.itemId > 65535) issues.push({ severity: "error", message: "Item ID must be 0–65535" });
  if (!i.name) issues.push({ severity: "error", message: "Item name is required" });
  if (i.price < 0) issues.push({ severity: "error", message: "Price cannot be negative" });
  if (i.isTM && !i.tmMoveConstant) issues.push({ severity: "error", message: "TM items must specify tmMoveConstant" });
  if (i.flingPower < 0 || i.flingPower > 255) issues.push({ severity: "error", message: "Fling power must be 0–255" });
  return issues;
}

export function validateStatus(s: StatusData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateConstantName(s.constantName, "STATUS_"));
  if (s.statusId < 0 || s.statusId > 65535) issues.push({ severity: "error", message: "Status ID must be 0–65535" });
  if (!s.name) issues.push({ severity: "error", message: "Status name is required" });
  if (!["volatile", "non_volatile", "field"].includes(s.category)) issues.push({ severity: "error", message: `Unknown status category: ${s.category}` });
  return issues;
}

// ---------------------------------------------------------------------------
// Change-plan markdown generator
// ---------------------------------------------------------------------------
export interface ChangeStep {
  targetFile: string;
  action: "insert" | "replace" | "delete" | "create_folder";
  reason: string;
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
}

export interface ChangePlan {
  mode: "add" | "edit" | "delete";
  entityType: string;
  entityConstant: string;
  steps: ChangeStep[];
  warnings: string[];
  errors: string[];
  generatedCode: string;
  isBlocked: boolean;
}

export function planToMarkdown(p: ChangePlan): string {
  const lines: string[] = [];
  lines.push("# Change Plan");
  lines.push("");
  lines.push(`- **Mode:** \`${p.mode}\``);
  lines.push(`- **Entity type:** \`${p.entityType}\``);
  lines.push(`- **Entity constant:** \`${p.entityConstant}\``);
  lines.push(`- **Blocked:** \`${p.isBlocked ? "YES" : "no"}\``);
  lines.push(`- **Steps:** ${p.steps.length}`);
  lines.push("");
  if (p.errors.length) {
    lines.push("## ❌ Errors (apply blocked)");
    p.errors.forEach((e) => lines.push(`- ${e}`));
    lines.push("");
  }
  if (p.warnings.length) {
    lines.push("## ⚠️ Warnings");
    p.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push("");
  }
  if (p.steps.length) {
    lines.push("## 📝 Steps");
    p.steps.forEach((s, i) => {
      lines.push(`### ${i + 1}. \`${s.action}\` — \`${s.targetFile}\``);
      lines.push(`- **Reason:** ${s.reason}`);
      lines.push(`- **Risk:** \`${s.riskLevel}\``);
      if (s.warnings.length) s.warnings.forEach((w) => lines.push(`  - ⚠️ ${w}`));
      lines.push("");
    });
  }
  if (p.generatedCode) {
    lines.push("## 📄 Generated code (preview)");
    lines.push("```c");
    lines.push(p.generatedCode);
    lines.push("```");
  }
  return lines.join("\n");
}
