// PokeForge — pokeemerald-expansion source file parser
// Extracts species, moves, types, and abilities constants from a real
// pokeemerald-expansion checkout. Based on the file structure documented
// in the Custom Pokémon PDF guide + AxoloteDex's species_reader.py.

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ParsedSpecies {
  constantName: string;
  speciesId: number;
  speciesName: string;
  types: string[];
  abilities: string[];
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseSpAttack: number;
  baseSpDefense: number;
  catchRate: number;
  expYield: number;
  growthRate: string;
  eggGroups: string[];
  genderRatio: number;
  bodyColor: string;
}

export interface ParsedMove {
  constantName: string;
  moveId: number;
  name: string;
  effect: string;
  power: number;
  type: string;
  accuracy: number;
  pp: number;
  category: string;
  target: string;
}

export interface ParsedType {
  constantName: string;
  name: string;
}

export interface ParsedAbility {
  constantName: string;
  name: string;
}

export interface ParseResult {
  species: ParsedSpecies[];
  moves: ParsedMove[];
  types: ParsedType[];
  abilities: ParsedAbility[];
  warnings: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readText(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Extract #define NAME VALUE pairs from a header file
function extractDefines(content: string, prefix: string): { constant: string; value: number }[] {
  const results: { constant: string; value: number }[] = [];
  const regex = new RegExp(`#define\\s+(${prefix}[A-Z0-9_]+)\\s+(\\d+)`, "g");
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({ constant: match[1], value: parseInt(match[2]) });
  }
  return results;
}

// Convert SPECIES_BULBASAUR → "Bulbasaur"
function constantToName(constant: string, prefix: string): string {
  return constant
    .replace(prefix, "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// ---------------------------------------------------------------------------
// Species parser — reads species.h + species_info.h
// ---------------------------------------------------------------------------
function parseSpecies(root: string, warnings: string[]): ParsedSpecies[] {
  const speciesHeader = readText(path.join(root, "include/constants/species.h"));
  if (!speciesHeader) {
    warnings.push("Could not read include/constants/species.h — skipping species");
    return [];
  }

  // Extract all SPECIES_* constants with their IDs
  const defines = extractDefines(speciesHeader, "SPECIES_");
  const species: ParsedSpecies[] = [];

  for (const { constant, value } of defines) {
    if (constant === "SPECIES_EGG" || constant === "SPECIES_NONE" || constant === "NUM_SPECIES") continue;
    if (value >= 20000) continue; // skip internal/special IDs

    species.push({
      constantName: constant,
      speciesId: value,
      speciesName: constantToName(constant, "SPECIES_"),
      types: ["TYPE_NORMAL"],
      abilities: ["ABILITY_NONE"],
      baseHP: 50, baseAttack: 50, baseDefense: 50, baseSpeed: 50, baseSpAttack: 50, baseSpDefense: 50,
      catchRate: 45, expYield: 100, growthRate: "GROWTH_MEDIUM_FAST",
      eggGroups: ["EGG_GROUP_NONE"], genderRatio: 127, bodyColor: "BODY_COLOR_RED",
    });
  }

  // Try to parse species_info.h for richer data
  const speciesInfoPath = path.join(root, "src/data/pokemon/species_info.h");
  const speciesInfo = readText(speciesInfoPath);
  if (speciesInfo) {
    for (const s of species) {
      // Find the species entry block
      const blockRegex = new RegExp(`\\[${s.constantName}\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\},`, "g");
      const blockMatch = blockRegex.exec(speciesInfo);
      if (!blockMatch) continue;
      const block = blockMatch[1];

      // Extract base stats
      const hpMatch = block.match(/\.baseHP\s*=\s*(\d+)/);
      if (hpMatch) s.baseHP = parseInt(hpMatch[1]);
      const atkMatch = block.match(/\.baseAttack\s*=\s*(\d+)/);
      if (atkMatch) s.baseAttack = parseInt(atkMatch[1]);
      const defMatch = block.match(/\.baseDefense\s*=\s*(\d+)/);
      if (defMatch) s.baseDefense = parseInt(defMatch[1]);
      const spdMatch = block.match(/\.baseSpeed\s*=\s*(\d+)/);
      if (spdMatch) s.baseSpeed = parseInt(spdMatch[1]);
      const spAtkMatch = block.match(/\.baseSpAttack\s*=\s*(\d+)/);
      if (spAtkMatch) s.baseSpAttack = parseInt(spAtkMatch[1]);
      const spDefMatch = block.match(/\.baseSpDefense\s*=\s*(\d+)/);
      if (spDefMatch) s.baseSpDefense = parseInt(spDefMatch[1]);

      // Extract types
      const typesMatch = block.match(/\.types\s*=\s*MON_TYPES\s*\(\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\)/);
      if (typesMatch) s.types = [typesMatch[1], typesMatch[2]].filter((t) => t !== "TYPE_NONE");

      // Extract abilities
      const abilMatch = block.match(/\.abilities\s*=\s*\{\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\}/);
      if (abilMatch) s.abilities = [abilMatch[1], abilMatch[2], abilMatch[3]].filter((a) => a !== "ABILITY_NONE");

      // Extract catch rate
      const catchMatch = block.match(/\.catchRate\s*=\s*(\d+)/);
      if (catchMatch) s.catchRate = parseInt(catchMatch[1]);

      // Extract exp yield
      const expMatch = block.match(/\.expYield\s*=\s*(\d+)/);
      if (expMatch) s.expYield = parseInt(expMatch[1]);

      // Extract growth rate
      const growthMatch = block.match(/\.growthRate\s*=\s*(GROWTH_[A-Z_]+)/);
      if (growthMatch) s.growthRate = growthMatch[1];

      // Extract gender ratio
      const genderMatch = block.match(/\.genderRatio\s*=\s*(?:PERCENT_FEMALE\s*\(\s*(\d+)\s*\)|MON_GENDERLESS|(\d+))/);
      if (genderMatch) {
        if (genderMatch[0].includes("MON_GENDERLESS")) s.genderRatio = 255;
        else s.genderRatio = parseInt(genderMatch[1] || genderMatch[2]);
      }

      // Extract body color
      const colorMatch = block.match(/\.bodyColor\s*=\s*(BODY_COLOR_[A-Z_]+)/);
      if (colorMatch) s.bodyColor = colorMatch[1];

      // Extract egg groups
      const eggMatch = block.match(/\.eggGroups\s*=\s*MON_EGG_GROUPS\s*\(\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\)/);
      if (eggMatch) s.eggGroups = [eggMatch[1], eggMatch[2]].filter((g) => g !== "EGG_GROUP_NONE");
    }
  } else {
    warnings.push("Could not read src/data/pokemon/species_info.h — species imported with default stats only");
  }

  return species;
}

// ---------------------------------------------------------------------------
// Moves parser — reads moves.h + battle_moves.h
// ---------------------------------------------------------------------------
function parseMoves(root: string, warnings: string[]): ParsedMove[] {
  const movesHeader = readText(path.join(root, "include/constants/moves.h"));
  if (!movesHeader) {
    warnings.push("Could not read include/constants/moves.h — skipping moves");
    return [];
  }

  const defines = extractDefines(movesHeader, "MOVE_");
  const moves: ParsedMove[] = [];

  for (const { constant, value } of defines) {
    if (constant === "MOVES_COUNT" || constant === "MOVE_UNAVAILABLE") continue;
    moves.push({
      constantName: constant,
      moveId: value,
      name: ConstantToName(constant.replace("MOVE_", "")),
      effect: "EFFECT_HIT",
      power: 40, type: "TYPE_NORMAL", accuracy: 100, pp: 35,
      category: "CATEGORY_PHYSICAL", target: "MOVE_TARGET_SELECTED",
    });
  }

  // Try to parse battle_moves.h for richer data
  const battleMovesPath = path.join(root, "src/data/battle_moves.h");
  const battleMoves = readText(battleMovesPath);
  if (battleMoves) {
    for (const m of moves) {
      const blockRegex = new RegExp(`\\[${m.constantName}\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, "g");
      const blockMatch = blockRegex.exec(battleMoves);
      if (!blockMatch) continue;
      const block = blockMatch[1];

      const powerMatch = block.match(/\.power\s*=\s*(\d+)/);
      if (powerMatch) m.power = parseInt(powerMatch[1]);
      const typeMatch = block.match(/\.type\s*=\s*(TYPE_[A-Z_]+)/);
      if (typeMatch) m.type = typeMatch[1];
      const accMatch = block.match(/\.accuracy\s*=\s*(\d+)/);
      if (accMatch) m.accuracy = parseInt(accMatch[1]);
      const ppMatch = block.match(/\.pp\s*=\s*(\d+)/);
      if (ppMatch) m.pp = parseInt(ppMatch[1]);
      const effectMatch = block.match(/\.effect\s*=\s*(EFFECT_[A-Z0-9_]+)/);
      if (effectMatch) m.effect = effectMatch[1];
      const catMatch = block.match(/\.category\s*=\s*(CATEGORY_[A-Z_]+)/);
      if (catMatch) m.category = catMatch[1];
      const targetMatch = block.match(/\.target\s*=\s*(MOVE_TARGET_[A-Z_]+)/);
      if (targetMatch) m.target = targetMatch[1];

      // Extract name
      const nameMatch = block.match(/\.name\s*=\s*COMPOUND_STRING\s*\(\s*"_([^"]+)"/);
      if (nameMatch) m.name = nameMatch[1].replace(/\\n/g, " ");
    }
  } else {
    warnings.push("Could not read src/data/battle_moves.h — moves imported with default values only");
  }

  return moves;
}

function ConstantToName(s: string): string {
  return s.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ---------------------------------------------------------------------------
// Types parser — reads types.h
// ---------------------------------------------------------------------------
function parseTypes(root: string, warnings: string[]): ParsedType[] {
  const typesHeader = readText(path.join(root, "include/constants/types.h"));
  if (!typesHeader) {
    warnings.push("Could not read include/constants/types.h — skipping types");
    return [];
  }

  const defines = extractDefines(typesHeader, "TYPE_");
  const types: ParsedType[] = [];
  for (const { constant } of defines) {
    if (constant === "NUMBER_OF_TYPES" || constant === "TYPE_NONE" || constant === "TYPE_MYSTERY") continue;
    types.push({
      constantName: constant,
      name: constantToName(constant, "TYPE_"),
    });
  }
  return types;
}

// ---------------------------------------------------------------------------
// Abilities parser — reads abilities.h
// ---------------------------------------------------------------------------
function parseAbilities(root: string, warnings: string[]): ParsedAbility[] {
  const abilitiesHeader = readText(path.join(root, "include/constants/abilities.h"));
  if (!abilitiesHeader) {
    warnings.push("Could not read include/constants/abilities.h — skipping abilities");
    return [];
  }

  const defines = extractDefines(abilitiesHeader, "ABILITY_");
  const abilities: ParsedAbility[] = [];
  for (const { constant } of defines) {
    if (constant === "ABILITIES_COUNT" || constant === "ABILITY_NONE") continue;
    abilities.push({
      constantName: constant,
      name: constantToName(constant, "ABILITY_"),
    });
  }
  return abilities;
}

// ---------------------------------------------------------------------------
// Main entry — validate project structure + parse all files
// ---------------------------------------------------------------------------
export function validatePokeemeraldProject(root: string): { valid: boolean; missing: string[] } {
  const required = [
    "include/constants/species.h",
    "include/constants/moves.h",
    "include/constants/abilities.h",
  ];
  const missing: string[] = [];
  for (const rel of required) {
    if (!fileExists(path.join(root, rel))) missing.push(rel);
  }
  return { valid: missing.length === 0, missing };
}

export function parsePokeemeraldProject(root: string): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const validation = validatePokeemeraldProject(root);
  if (!validation.valid) {
    return {
      species: [],
      moves: [],
      types: [],
      abilities: [],
      warnings,
      errors: [`Invalid pokeemerald-expansion project. Missing files: ${validation.missing.join(", ")}`],
    };
  }

  const species = parseSpecies(root, warnings);
  const moves = parseMoves(root, warnings);
  const types = parseTypes(root, warnings);
  const abilities = parseAbilities(root, warnings);

  return { species, moves, types, abilities, warnings, errors };
}
