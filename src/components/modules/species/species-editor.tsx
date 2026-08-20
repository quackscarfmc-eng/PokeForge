"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Copy, Eye, Loader2, Save, ShieldCheck, Plus, ArrowUp, ArrowDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useValidate,
} from "@/components/shared/entity-hooks";
import { TypeBadge } from "@/components/shared/type-badge";
import { PokeballIcon } from "@/components/app/pokeball-icon";
import { generateSpeciesCode } from "@/lib/poke-codegen";
import {
  POKEMON_TYPES,
  GROWTH_RATES,
  EGG_GROUPS,
  BODY_COLORS,
  CRY_IDS,
  FRONT_ANIM_IDS,
  BACK_ANIM_IDS,
  GENDER_RATIOS,
  SPECIES_FLAGS,
  STAT_META,
  BUILTIN_ABILITIES,
  EVO_METHODS,
  TYPE_COLOR,
  TYPE_NAME,
} from "@/lib/poke-constants";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface LearnsetMove {
  level: number;
  moveConstant: string;
}

export interface EvolutionEntry {
  method: string;
  param: string;
  targetSpecies: string;
}

export interface SpeciesWithNested {
  id: string;
  projectId: string;
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
  types: string; // JSON string
  catchRate: number;
  expYield: number;
  genderRatio: number;
  eggCycles: number;
  friendship: number;
  growthRate: string;
  eggGroups: string; // JSON string
  abilities: string; // JSON string
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
  spriteFrontDataUrl?: string | null;
  flags: string; // JSON string
  learnsetMoves: { id: string; level: number; moveConstant: string }[];
  evolutions: { id: string; method: string; param: string; targetSpecies: string }[];
  createdAt: string;
  updatedAt: string;
}

// Form state mirrors the API payload shape (arrays, not JSON strings)
export interface SpeciesFormState {
  constantName: string;
  speciesId: number;
  speciesName: string;
  nationalDexNum: number | null;
  hoennDexNum: number | null;
  categoryName: string;
  description: string;
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
  types: string[];
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
  frontPicSymbol: string;
  backPicSymbol: string;
  iconSymbol: string;
  footprintSymbol: string;
  paletteSymbol: string;
  shinyPaletteSymbol: string;
  frontAnimId: string;
  backAnimId: string;
  frontPicWidth: number;
  frontPicHeight: number;
  backPicWidth: number;
  backPicHeight: number;
  cryId: string;
  flags: string[];
  learnsetMoves: LearnsetMove[];
  evolutions: EvolutionEntry[];
}

// ---------------------------------------------------------------------------
// Builtin moves list (used by the learnset combobox — no canonical export exists
// in poke-constants.ts yet, so we ship a curated subset of common Gen-3 moves)
// ---------------------------------------------------------------------------
const BUILTIN_MOVES: { constant: string; name: string }[] = [
  { constant: "MOVE_NONE", name: "(None)" },
  { constant: "MOVE_POUND", name: "Pound" },
  { constant: "MOVE_KARATE_CHOP", name: "Karate Chop" },
  { constant: "MOVE_DOUBLESLAP", name: "Double Slap" },
  { constant: "MOVE_COMET_PUNCH", name: "Comet Punch" },
  { constant: "MOVE_MEGA_PUNCH", name: "Mega Punch" },
  { constant: "MOVE_PAY_DAY", name: "Pay Day" },
  { constant: "MOVE_FIRE_PUNCH", name: "Fire Punch" },
  { constant: "MOVE_ICE_PUNCH", name: "Ice Punch" },
  { constant: "MOVE_THUNDERPUNCH", name: "Thunder Punch" },
  { constant: "MOVE_SCRATCH", name: "Scratch" },
  { constant: "MOVE_VICEGRIP", name: "Vice Grip" },
  { constant: "MOVE_GUILLOTINE", name: "Guillotine" },
  { constant: "MOVE_RAZOR_WIND", name: "Razor Wind" },
  { constant: "MOVE_SWORDS_DANCE", name: "Swords Dance" },
  { constant: "MOVE_CUT", name: "Cut" },
  { constant: "MOVE_GUST", name: "Gust" },
  { constant: "MOVE_WING_ATTACK", name: "Wing Attack" },
  { constant: "MOVE_WHIRLWIND", name: "Whirlwind" },
  { constant: "MOVE_FLY", name: "Fly" },
  { constant: "MOVE_BIND", name: "Bind" },
  { constant: "MOVE_SLAM", name: "Slam" },
  { constant: "MOVE_VINE_WHIP", name: "Vine Whip" },
  { constant: "MOVE_STOMP", name: "Stomp" },
  { constant: "MOVE_DOUBLE_KICK", name: "Double Kick" },
  { constant: "MOVE_MEGA_KICK", name: "Mega Kick" },
  { constant: "MOVE_JUMP_KICK", name: "Jump Kick" },
  { constant: "MOVE_ROLLING_KICK", name: "Rolling Kick" },
  { constant: "MOVE_SAND_ATTACK", name: "Sand Attack" },
  { constant: "MOVE_HEADBUTT", name: "Headbutt" },
  { constant: "MOVE_HORN_ATTACK", name: "Horn Attack" },
  { constant: "MOVE_FURY_ATTACK", name: "Fury Attack" },
  { constant: "MOVE_TACKLE", name: "Tackle" },
  { constant: "MOVE_BODY_SLAM", name: "Body Slam" },
  { constant: "MOVE_WRAP", name: "Wrap" },
  { constant: "MOVE_TAKE_DOWN", name: "Take Down" },
  { constant: "MOVE_THRASH", name: "Thrash" },
  { constant: "MOVE_DOUBLE_EDGE", name: "Double Edge" },
  { constant: "MOVE_TAIL_WHIP", name: "Tail Whip" },
  { constant: "MOVE_POISON_STING", name: "Poison Sting" },
  { constant: "MOVE_TWINEEDLE", name: "Twineedle" },
  { constant: "MOVE_PIN_MISSILE", name: "Pin Missile" },
  { constant: "MOVE_LEER", name: "Leer" },
  { constant: "MOVE_BITE", name: "Bite" },
  { constant: "MOVE_GROWL", name: "Growl" },
  { constant: "MOVE_ROAR", name: "Roar" },
  { constant: "MOVE_SING", name: "Sing" },
  { constant: "MOVE_SUPERSONIC", name: "Supersonic" },
  { constant: "MOVE_SONICBOOM", name: "Sonic Boom" },
  { constant: "MOVE_DISABLE", name: "Disable" },
  { constant: "MOVE_ACID", name: "Acid" },
  { constant: "MOVE_EMBER", name: "Ember" },
  { constant: "MOVE_FLAMETHROWER", name: "Flamethrower" },
  { constant: "MOVE_MIST", name: "Mist" },
  { constant: "MOVE_WATER_GUN", name: "Water Gun" },
  { constant: "MOVE_HYDRO_PUMP", name: "Hydro Pump" },
  { constant: "MOVE_SURF", name: "Surf" },
  { constant: "MOVE_ICE_BEAM", name: "Ice Beam" },
  { constant: "MOVE_BLIZZARD", name: "Blizzard" },
  { constant: "MOVE_PSYBEAM", name: "Psybeam" },
  { constant: "MOVE_BUBBLEBEAM", name: "Bubble Beam" },
  { constant: "MOVE_AURORA_BEAM", name: "Aurora Beam" },
  { constant: "MOVE_HYPER_BEAM", name: "Hyper Beam" },
  { constant: "MOVE_PECK", name: "Peck" },
  { constant: "MOVE_DRILL_PECK", name: "Drill Peck" },
  { constant: "MOVE_SUBMISSION", name: "Submission" },
  { constant: "MOVE_LOW_KICK", name: "Low Kick" },
  { constant: "MOVE_COUNTER", name: "Counter" },
  { constant: "MOVE_SEISMIC_TOSS", name: "Seismic Toss" },
  { constant: "MOVE_STRENGTH", name: "Strength" },
  { constant: "MOVE_ABSORB", name: "Absorb" },
  { constant: "MOVE_MEGA_DRAIN", name: "Mega Drain" },
  { constant: "MOVE_RAZOR_LEAF", name: "Razor Leaf" },
  { constant: "MOVE_SOLARBEAM", name: "Solar Beam" },
  { constant: "MOVE_POISONPOWDER", name: "Poison Powder" },
  { constant: "MOVE_STUN_SPORE", name: "Stun Spore" },
  { constant: "MOVE_SLEEP_POWDER", name: "Sleep Powder" },
  { constant: "MOVE_PETAL_DANCE", name: "Petal Dance" },
  { constant: "MOVE_STRING_SHOT", name: "String Shot" },
  { constant: "MOVE_DRAGON_RAGE", name: "Dragon Rage" },
  { constant: "MOVE_FIRE_SPIN", name: "Fire Spin" },
  { constant: "MOVE_THUNDERSHOCK", name: "Thundershock" },
  { constant: "MOVE_THUNDERBOLT", name: "Thunderbolt" },
  { constant: "MOVE_THUNDER_WAVE", name: "Thunder Wave" },
  { constant: "MOVE_THUNDER", name: "Thunder" },
  { constant: "MOVE_ROCK_THROW", name: "Rock Throw" },
  { constant: "MOVE_EARTHQUAKE", name: "Earthquake" },
  { constant: "MOVE_FISSURE", name: "Fissure" },
  { constant: "MOVE_DIG", name: "Dig" },
  { constant: "MOVE_TOXIC", name: "Toxic" },
  { constant: "MOVE_CONFUSION", name: "Confusion" },
  { constant: "MOVE_PSYCHIC", name: "Psychic" },
  { constant: "MOVE_HYPNOSIS", name: "Hypnosis" },
  { constant: "MOVE_MEDITATE", name: "Meditate" },
  { constant: "MOVE_AGILITY", name: "Agility" },
  { constant: "MOVE_QUICK_ATTACK", name: "Quick Attack" },
  { constant: "MOVE_RAGE", name: "Rage" },
  { constant: "MOVE_TELEPORT", name: "Teleport" },
  { constant: "MOVE_NIGHT_SHADE", name: "Night Shade" },
  { constant: "MOVE_MIMIC", name: "Mimic" },
  { constant: "MOVE_SCREECH", name: "Screech" },
  { constant: "MOVE_DOUBLE_TEAM", name: "Double Team" },
  { constant: "MOVE_RECOVER", name: "Recover" },
  { constant: "MOVE_HARDEN", name: "Harden" },
  { constant: "MOVE_MINIMIZE", name: "Minimize" },
  { constant: "MOVE_SMOKESCREEN", name: "Smokescreen" },
  { constant: "MOVE_CONFUSE_RAY", name: "Confuse Ray" },
  { constant: "MOVE_WITHDRAW", name: "Withdraw" },
  { constant: "MOVE_DEFENSE_CURL", name: "Defense Curl" },
  { constant: "MOVE_BARRIER", name: "Barrier" },
  { constant: "MOVE_LIGHT_SCREEN", name: "Light Screen" },
  { constant: "MOVE_HAZE", name: "Haze" },
  { constant: "MOVE_REFLECT", name: "Reflect" },
  { constant: "MOVE_FOCUS_ENERGY", name: "Focus Energy" },
  { constant: "MOVE_BIDE", name: "Bide" },
  { constant: "MOVE_METRONOME", name: "Metronome" },
  { constant: "MOVE_MIRROR_MOVE", name: "Mirror Move" },
  { constant: "MOVE_SELFDESTRUCT", name: "Self Destruct" },
  { constant: "MOVE_EGG_BOMB", name: "Egg Bomb" },
  { constant: "MOVE_LICK", name: "Lick" },
  { constant: "MOVE_SMOG", name: "Smog" },
  { constant: "MOVE_SLUDGE", name: "Sludge" },
  { constant: "MOVE_BONE_CLUB", name: "Bone Club" },
  { constant: "MOVE_FIRE_BLAST", name: "Fire Blast" },
  { constant: "MOVE_WATERFALL", name: "Waterfall" },
  { constant: "MOVE_CLAMP", name: "Clamp" },
  { constant: "MOVE_SWIFT", name: "Swift" },
  { constant: "MOVE_SKULL_BASH", name: "Skull Bash" },
  { constant: "MOVE_SPIKE_CANNON", name: "Spike Cannon" },
  { constant: "MOVE_CONSTRICT", name: "Constrict" },
  { constant: "MOVE_AMNESIA", name: "Amnesia" },
  { constant: "MOVE_KINESIS", name: "Kinesis" },
  { constant: "MOVE_SOFTBOILED", name: "Soft Boiled" },
  { constant: "MOVE_HI_JUMP_KICK", name: "Hi Jump Kick" },
  { constant: "MOVE_GLARE", name: "Glare" },
  { constant: "MOVE_DREAM_EATER", name: "Dream Eater" },
  { constant: "MOVE_POISON_GAS", name: "Poison Gas" },
  { constant: "MOVE_BARRAGE", name: "Barrage" },
  { constant: "MOVE_LEECH_LIFE", name: "Leech Life" },
  { constant: "MOVE_LOVELY_KISS", name: "Lovely Kiss" },
  { constant: "MOVE_SKY_ATTACK", name: "Sky Attack" },
  { constant: "MOVE_TRANSFORM", name: "Transform" },
  { constant: "MOVE_BUBBLE", name: "Bubble" },
  { constant: "MOVE_DIZZY_PUNCH", name: "Dizzy Punch" },
  { constant: "MOVE_SPORE", name: "Spore" },
  { constant: "MOVE_FLASH", name: "Flash" },
  { constant: "MOVE_PSYWAVE", name: "Psywave" },
  { constant: "MOVE_SPLASH", name: "Splash" },
  { constant: "MOVE_ACID_ARMOR", name: "Acid Armor" },
  { constant: "MOVE_CRABHAMMER", name: "Crabhammer" },
  { constant: "MOVE_EXPLOSION", name: "Explosion" },
  { constant: "MOVE_FURY_SWIPES", name: "Fury Swipes" },
  { constant: "MOVE_BONEMERANG", name: "Bonemerang" },
  { constant: "MOVE_REST", name: "Rest" },
  { constant: "MOVE_ROCK_SLIDE", name: "Rock Slide" },
  { constant: "MOVE_HYPER_FANG", name: "Hyper Fang" },
  { constant: "MOVE_SHARPEN", name: "Sharpen" },
  { constant: "MOVE_CONVERSION", name: "Conversion" },
  { constant: "MOVE_TRI_ATTACK", name: "Tri Attack" },
  { constant: "MOVE_SUPER_FANG", name: "Super Fang" },
  { constant: "MOVE_SLASH", name: "Slash" },
  { constant: "MOVE_SUBSTITUTE", name: "Substitute" },
  { constant: "MOVE_STRUGGLE", name: "Struggle" },
  { constant: "MOVE_SKETCH", name: "Sketch" },
  { constant: "MOVE_AEROBLAST", name: "Aeroblast" },
  { constant: "MOVE_SHADOW_BALL", name: "Shadow Ball" },
  { constant: "MOVE_FUTURE_SIGHT", name: "Future Sight" },
  { constant: "MOVE_ROCK_SMASH", name: "Rock Smash" },
  { constant: "MOVE_WHIRLPOOL", name: "Whirlpool" },
  { constant: "MOVE_FAIRY_WIND", name: "Fairy Wind" },
  { constant: "MOVE_MOONBLAST", name: "Moonblast" },
  { constant: "MOVE_DAZZLING_GLEAM", name: "Dazzling Gleam" },
  { constant: "MOVE_PLAY_ROUGH", name: "Play Rough" },
  { constant: "MOVE_DRAGON_CLAW", name: "Dragon Claw" },
  { constant: "MOVE_DRAGON_PULSE", name: "Dragon Pulse" },
  { constant: "MOVE_DRAGON_DANCE", name: "Dragon Dance" },
  { constant: "MOVE_CLOSE_COMBAT", name: "Close Combat" },
  { constant: "MOVE_LEAF_BLADE", name: "Leaf Blade" },
  { constant: "MOVE_AQUA_TAIL", name: "Aqua Tail" },
  { constant: "MOVE_IRON_TAIL", name: "Iron Tail" },
  { constant: "MOVE_SHADOW_CLAW", name: "Shadow Claw" },
  { constant: "MOVE_POISON_JAB", name: "Poison Jab" },
  { constant: "MOVE_X_SCISSOR", name: "X-Scissor" },
  { constant: "MOVE_AERIAL_ACE", name: "Aerial Ace" },
  { constant: "MOVE_AIR_SLASH", name: "Air Slash" },
  { constant: "MOVE_BRAVE_BIRD", name: "Brave Bird" },
  { constant: "MOVE_BUG_BUZZ", name: "Bug Buzz" },
  { constant: "MOVE_CROSS_POISON", name: "Cross Poison" },
  { constant: "MOVE_EARTH_POWER", name: "Earth Power" },
  { constant: "MOVE_ENERGY_BALL", name: "Energy Ball" },
  { constant: "MOVE_FOCUS_BLAST", name: "Focus Blast" },
  { constant: "MOVE_GIGA_IMPACT", name: "Giga Impact" },
  { constant: "MOVE_GUNK_SHOT", name: "Gunk Shot" },
  { constant: "MOVE_HEAD_SMASH", name: "Head Smash" },
  { constant: "MOVE_ICE_FANG", name: "Ice Fang" },
  { constant: "MOVE_FIRE_FANG", name: "Fire Fang" },
  { constant: "MOVE_THUNDER_FANG", name: "Thunder Fang" },
  { constant: "MOVE_ICE_SHARD", name: "Ice Shard" },
  { constant: "MOVE_NIGHT_SLASH", name: "Night Slash" },
  { constant: "MOVE_POWER_GEM", name: "Power Gem" },
  { constant: "MOVE_POWER_WHIP", name: "Power Whip" },
  { constant: "MOVE_PSYSHOCK", name: "Psyshock" },
  { constant: "MOVE_ROCK_POLISH", name: "Rock Polish" },
  { constant: "MOVE_SEED_BOMB", name: "Seed Bomb" },
  { constant: "MOVE_SHADOW_FORCE", name: "Shadow Force" },
  { constant: "MOVE_STONE_EDGE", name: "Stone Edge" },
  { constant: "MOVE_ZEN_HEADBUTT", name: "Zen Headbutt" },
];

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------
function makeDefaultForm(nextSpeciesId: number): SpeciesFormState {
  return {
    constantName: "SPECIES_",
    speciesId: nextSpeciesId,
    speciesName: "",
    nationalDexNum: null,
    hoennDexNum: null,
    categoryName: "",
    description: "",
    baseHP: 50,
    baseAttack: 50,
    baseDefense: 50,
    baseSpeed: 50,
    baseSpAttack: 50,
    baseSpDefense: 50,
    evYieldHP: 0,
    evYieldAttack: 0,
    evYieldDefense: 0,
    evYieldSpeed: 0,
    evYieldSpAttack: 0,
    evYieldSpDefense: 0,
    types: ["TYPE_NORMAL"],
    catchRate: 45,
    expYield: 100,
    genderRatio: 127,
    eggCycles: 20,
    friendship: 70,
    growthRate: "GROWTH_MEDIUM_FAST",
    eggGroups: ["EGG_GROUP_FIELD", "EGG_GROUP_NONE"],
    abilities: ["ABILITY_NONE", "ABILITY_NONE", "ABILITY_NONE"],
    bodyColor: "BODY_COLOR_RED",
    noFlip: false,
    height: 10,
    weight: 250,
    frontPicSymbol: "",
    backPicSymbol: "",
    iconSymbol: "",
    footprintSymbol: "",
    paletteSymbol: "",
    shinyPaletteSymbol: "",
    frontAnimId: "ANIM_V_JOLT",
    backAnimId: "BACK_ANIM_CONCAVE_ARC_SMALL",
    frontPicWidth: 64,
    frontPicHeight: 64,
    backPicWidth: 64,
    backPicHeight: 64,
    cryId: "CRY_BULBASAUR",
    flags: [],
    learnsetMoves: [{ level: 1, moveConstant: "MOVE_TACKLE" }],
    evolutions: [],
  };
}

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function speciesToForm(s: SpeciesWithNested): SpeciesFormState {
  return {
    constantName: s.constantName,
    speciesId: s.speciesId,
    speciesName: s.speciesName,
    nationalDexNum: s.nationalDexNum ?? null,
    hoennDexNum: s.hoennDexNum ?? null,
    categoryName: s.categoryName ?? "",
    description: s.description ?? "",
    baseHP: s.baseHP,
    baseAttack: s.baseAttack,
    baseDefense: s.baseDefense,
    baseSpeed: s.baseSpeed,
    baseSpAttack: s.baseSpAttack,
    baseSpDefense: s.baseSpDefense,
    evYieldHP: s.evYieldHP,
    evYieldAttack: s.evYieldAttack,
    evYieldDefense: s.evYieldDefense,
    evYieldSpeed: s.evYieldSpeed,
    evYieldSpAttack: s.evYieldSpAttack,
    evYieldSpDefense: s.evYieldSpDefense,
    types: parseJsonArray<string>(s.types, ["TYPE_NORMAL"]),
    catchRate: s.catchRate,
    expYield: s.expYield,
    genderRatio: s.genderRatio,
    eggCycles: s.eggCycles,
    friendship: s.friendship,
    growthRate: s.growthRate,
    eggGroups: parseJsonArray<string>(s.eggGroups, ["EGG_GROUP_NONE"]),
    abilities: parseJsonArray<string>(s.abilities, ["ABILITY_NONE"]),
    bodyColor: s.bodyColor,
    noFlip: s.noFlip,
    height: s.height,
    weight: s.weight,
    frontPicSymbol: s.frontPicSymbol ?? "",
    backPicSymbol: s.backPicSymbol ?? "",
    iconSymbol: s.iconSymbol ?? "",
    footprintSymbol: s.footprintSymbol ?? "",
    paletteSymbol: s.paletteSymbol ?? "",
    shinyPaletteSymbol: s.shinyPaletteSymbol ?? "",
    frontAnimId: s.frontAnimId,
    backAnimId: s.backAnimId,
    frontPicWidth: s.frontPicWidth,
    frontPicHeight: s.frontPicHeight,
    backPicWidth: s.backPicWidth,
    backPicHeight: s.backPicHeight,
    cryId: s.cryId,
    flags: parseJsonArray<string>(s.flags, []),
    learnsetMoves: (s.learnsetMoves ?? []).map((m) => ({
      level: m.level,
      moveConstant: m.moveConstant,
    })),
    evolutions: (s.evolutions ?? []).map((e) => ({
      method: e.method,
      param: e.param,
      targetSpecies: e.targetSpecies,
    })),
  };
}

// ---------------------------------------------------------------------------
// Small reusable widgets
// ---------------------------------------------------------------------------
function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <Label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {hint && <span className="ml-1 font-normal normal-case text-muted-foreground/70">— {hint}</span>}
    </Label>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums">{value}</span>
    </div>
  );
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          onChange(null);
          return;
        }
        const n = Number(v);
        if (Number.isNaN(n)) return;
        onChange(n);
      }}
      className="h-8"
    />
  );
}

// A typeahead combobox for moves — supports built-in + custom moves, with search
function MoveCombobox({
  value,
  onChange,
  customMoves,
}: {
  value: string;
  onChange: (v: string) => void;
  customMoves: { constant: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const allMoves = useMemo(() => {
    const map = new Map<string, { constant: string; name: string }>();
    for (const m of BUILTIN_MOVES) map.set(m.constant, m);
    for (const m of customMoves) map.set(m.constant, m);
    return Array.from(map.values());
  }, [customMoves]);

  const selected = allMoves.find((m) => m.constant === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between font-mono text-xs"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.constant : "Select move…"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search moves…" />
          <CommandList>
            <CommandEmpty>No move found.</CommandEmpty>
            {customMoves.length > 0 && (
              <CommandGroup heading="Custom (this project)">
                {customMoves.map((m) => (
                  <CommandItem
                    key={m.constant}
                    value={`${m.constant} ${m.name}`}
                    onSelect={() => {
                      onChange(m.constant);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-1 h-3.5 w-3.5",
                        value === m.constant ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-xs">{m.constant}</span>
                    <span className="ml-1 truncate text-xs text-muted-foreground">{m.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Built-in">
              {allMoves
                .filter((m) => !customMoves.some((c) => c.constant === m.constant))
                .map((m) => (
                  <CommandItem
                    key={m.constant}
                    value={`${m.constant} ${m.name}`}
                    onSelect={() => {
                      onChange(m.constant);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-1 h-3.5 w-3.5",
                        value === m.constant ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-xs">{m.constant}</span>
                    <span className="ml-1 truncate text-xs text-muted-foreground">{m.name}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Validation issue shape from /api/validate
// ---------------------------------------------------------------------------
interface ValidationIssue {
  severity: "error" | "warning" | string;
  message: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SpeciesEditor({
  species,
  open,
  onOpenChange,
}: {
  species: SpeciesWithNested | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { currentProjectId } = useAppStore();
  const isEdit = !!species;

  // Fetch project to prefill nextSpeciesId in create mode
  const { data: projectData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      if (!r.ok) throw new Error("Failed to fetch project");
      return r.json();
    },
    enabled: !!currentProjectId && open,
  });
  const nextSpeciesId = projectData?.project?.nextSpeciesId ?? 1524;

  // Fetch custom types, abilities, moves for combos
  const { data: typesData } = useEntities<{ constantName: string; name: string }>("types");
  const { data: abilitiesData } = useEntities<{ constantName: string; name: string }>("abilities");
  const { data: movesData } = useEntities<{ constantName: string; name: string }>("moves");
  const { data: speciesData } = useEntities<SpeciesWithNested>("species");

  const customTypes = typesData?.types ?? [];
  const customAbilities = abilitiesData?.abilities ?? [];
  const customMoves = movesData?.moves ?? [];
  const allSpeciesConstants = (speciesData?.species ?? []).map((s) => s.constantName);

  const [form, setForm] = useState<SpeciesFormState>(() =>
    species ? speciesToForm(species) : makeDefaultForm(nextSpeciesId),
  );
  const [tab, setTab] = useState("identity");
  const [validation, setValidation] = useState<ValidationIssue[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // NOTE: This component is remounted by the parent (via `key`) whenever the
  // target species changes or the editor is reopened. We therefore seed the
  // initial state from props directly in useState, instead of syncing via
  // useEffect (which would trigger cascading renders — see React 19 guidance).

  const update = useCallback(
    <K extends keyof SpeciesFormState>(key: K, value: SpeciesFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const totalEV =
    form.evYieldHP +
    form.evYieldAttack +
    form.evYieldDefense +
    form.evYieldSpeed +
    form.evYieldSpAttack +
    form.evYieldSpDefense;

  const totalBase =
    form.baseHP +
    form.baseAttack +
    form.baseDefense +
    form.baseSpeed +
    form.baseSpAttack +
    form.baseSpDefense;

  // Mutations
  const createMut = useCreateEntity<SpeciesFormState & { projectId?: string }>("species");
  const updateMut = useUpdateEntity<SpeciesFormState>("species");
  const validateMut = useValidate();

  const buildPayload = useCallback(
    (): SpeciesFormState => ({
      ...form,
      // Ensure arrays are clean
      types: form.types.filter(Boolean).slice(0, 2),
      eggGroups: form.eggGroups.filter(Boolean).slice(0, 2),
      abilities: form.abilities.filter(Boolean).slice(0, 3),
      flags: form.flags.filter(Boolean),
      // Sort learnset by level on save
      learnsetMoves: [...form.learnsetMoves]
        .filter((m) => m.moveConstant && m.moveConstant !== "MOVE_NONE")
        .sort((a, b) => a.level - b.level),
      evolutions: form.evolutions.filter((e) => e.targetSpecies),
    }),
    [form],
  );

  function handleValidate() {
    const payload = buildPayload();
    validateMut.mutate(
      { entityType: "species", data: payload as unknown as Record<string, unknown> },
      {
        onSuccess: (res) => {
          const issues: ValidationIssue[] = [
            ...(res.errors ?? []),
            ...(res.warnings ?? []),
          ];
          setValidation(issues);
          if (res.ok) {
            toast.success(`Validation passed (${issues.length} warning(s))`);
          } else {
            toast.error(`Validation failed: ${res.errors.length} error(s)`);
          }
        },
        onError: () => toast.error("Validation request failed"),
      },
    );
  }

  function handleSave() {
    const payload = buildPayload();
    if (!payload.constantName.startsWith("SPECIES_") || payload.constantName.length < "SPECIES_X".length) {
      toast.error("Constant name must start with SPECIES_ and be at least 8 chars");
      setTab("identity");
      return;
    }
    if (!payload.speciesName.trim()) {
      toast.error("Species name is required");
      setTab("identity");
      return;
    }
    if (isEdit && species) {
      updateMut.mutate(
        { id: species.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  }

  const generatedCode = useMemo(() => {
    const payload = buildPayload();
    return generateSpeciesCode(
      payload as never,
      payload.learnsetMoves,
      payload.evolutions,
    );
  }, [buildPayload]);

  // Folder name hint: graphics/pokemon/<lowercase-constant>/
  const folderHint = form.constantName.replace(/^SPECIES_/, "").toLowerCase();

  // Derived options
  const typeOptions = [
    ...POKEMON_TYPES,
    ...customTypes.map((t) => ({ constant: t.constantName, name: t.name, color: "#68A090" })),
  ];
  const abilityOptions = [
    ...BUILTIN_ABILITIES,
    ...customAbilities.map((a) => ({ constant: a.constantName, name: a.name })),
  ];

  const primaryType = form.types[0] ?? "TYPE_NORMAL";
  const placeholderTint = TYPE_COLOR(primaryType);

  const errors = (validation ?? []).filter((i) => i.severity === "error");
  const warnings = (validation ?? []).filter((i) => i.severity === "warning");
  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            {form.spriteFrontDataUrl || species?.spriteFrontDataUrl ? (
              <img
                src={(form.spriteFrontDataUrl || species?.spriteFrontDataUrl) as string}
                alt={form.speciesName}
                className="h-10 w-10 rounded border border-border bg-muted object-contain"
              />
            ) : (
              <PokeballIcon
                className="h-10 w-10"
                // tint via filter is impractical here; the icon stays red by default
              />
            )}
            <div>
              <SheetTitle className="text-base">
                {isEdit ? "Edit Pokémon" : "New Pokémon"}
              </SheetTitle>
              <SheetDescription className="font-mono text-[11px]">
                {form.constantName || "SPECIES_…"} · ID #{form.speciesId}
              </SheetDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            graphics/pokemon/{folderHint || "..."}/
          </Badge>
        </SheetHeader>

        {/* Tabs + content scroll area */}
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b border-border px-3 py-2">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="identity" className="text-xs">Identity</TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">Base Stats</TabsTrigger>
              <TabsTrigger value="types" className="text-xs">Types & Abilities</TabsTrigger>
              <TabsTrigger value="graphics" className="text-xs">Graphics</TabsTrigger>
              <TabsTrigger value="learnset" className="text-xs">
                Learnset
                {form.learnsetMoves.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                    {form.learnsetMoves.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="evolutions" className="text-xs">
                Evolutions
                {form.evolutions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                    {form.evolutions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="flags" className="text-xs">Flags</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 px-5 py-5">
              {/* ===== Identity ===== */}
              <TabsContent value="identity" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel hint="auto from name">Constant name</FieldLabel>
                    <Input
                      value={form.constantName}
                      onChange={(e) => update("constantName", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                      placeholder="SPECIES_MYMON"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="auto from project">Species ID</FieldLabel>
                    <NumberField
                      value={form.speciesId}
                      onChange={(v) => update("speciesId", v ?? 0)}
                      min={0}
                      max={65535}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Species name</FieldLabel>
                    <Input
                      value={form.speciesName}
                      onChange={(e) => {
                        const name = e.target.value;
                        // Auto-suggest constant name when in create mode & field untouched
                        const suggested =
                          "SPECIES_" +
                          name
                            .toUpperCase()
                            .replace(/[^A-Z0-9]+/g, "_")
                            .replace(/^_+|_+$/g, "");
                        setForm((prev) => {
                          // Only auto-set if current constant is empty/default-ish
                          const untouched =
                            prev.constantName === "SPECIES_" ||
                            prev.constantName === suggestedPrev(prev.speciesName);
                          return {
                            ...prev,
                            speciesName: name,
                            constantName: untouched ? suggested : prev.constantName,
                          };
                        });
                      }}
                      placeholder="Mymon"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Category name</FieldLabel>
                    <Input
                      value={form.categoryName}
                      onChange={(e) => update("categoryName", e.target.value)}
                      placeholder="Mythical"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="optional">National Dex #</FieldLabel>
                    <NumberField
                      value={form.nationalDexNum}
                      onChange={(v) => update("nationalDexNum", v)}
                      min={0}
                      max={9999}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="optional">Hoenn Dex #</FieldLabel>
                    <NumberField
                      value={form.hoennDexNum}
                      onChange={(v) => update("hoennDexNum", v)}
                      min={0}
                      max={9999}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <FieldLabel>Pokédex description</FieldLabel>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="A mysterious creature that…"
                      rows={4}
                      className="resize-y"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Will be wrapped in COMPOUND_STRING(). Use newlines to break paragraphs.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ===== Base Stats ===== */}
              <TabsContent value="stats" className="mt-0">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel>Base stats (0–255)</FieldLabel>
                    {STAT_META.map((s) => (
                      <div key={s.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: s.color }}>
                            {s.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">max {s.max}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={form[s.key as keyof SpeciesFormState] as number}
                            min={0}
                            max={255}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n)) update(s.key as keyof SpeciesFormState, Math.max(0, Math.min(255, n)) as never);
                            }}
                            className="h-8 w-20"
                          />
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (Number(form[s.key as keyof SpeciesFormState]) / 255) * 100)}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                      <Badge variant="secondary" className="font-mono">{totalBase}</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldLabel hint="0–3 each, ≤510 total">EV yields</FieldLabel>
                    {STAT_META.map((s) => {
                      const evKey = s.key.replace("base", "evYield") as keyof SpeciesFormState;
                      return (
                        <div key={evKey as string} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium" style={{ color: s.color }}>
                            {s.label}
                          </span>
                          <Input
                            type="number"
                            value={form[evKey] as number}
                            min={0}
                            max={3}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n)) update(evKey, Math.max(0, Math.min(3, n)) as never);
                            }}
                            className="h-8 w-16"
                          />
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">EV total</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-mono",
                          totalEV > 510 && "bg-red-500/15 text-red-700 dark:text-red-300",
                        )}
                      >
                        {totalEV} / 510
                      </Badge>
                    </div>

                    {/* Visual stat bars summary */}
                    <div className="mt-3 rounded-md border border-border bg-card/50 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Stat distribution
                      </p>
                      <div className="space-y-1.5">
                        {STAT_META.map((s) => (
                          <StatBar
                            key={s.key}
                            label={s.label}
                            value={form[s.key as keyof SpeciesFormState] as number}
                            max={255}
                            color={s.color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ===== Types & Abilities ===== */}
              <TabsContent value="types" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel>Types (max 2)</FieldLabel>
                    {[0, 1].map((i) => (
                      <div key={i} className="space-y-1">
                        <Select
                          value={form.types[i] ?? ""}
                          onValueChange={(v) => {
                            const next = [...form.types];
                            if (v === "__none__") {
                              next.splice(i, 1);
                            } else {
                              next[i] = v;
                            }
                            update("types", next.filter(Boolean));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Type ${i + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">(remove)</SelectItem>
                            <SelectGroup>
                              <SelectLabel>Built-in</SelectLabel>
                              {POKEMON_TYPES.map((t) => (
                                <SelectItem key={t.constant} value={t.constant}>
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full"
                                      style={{ backgroundColor: t.color }}
                                    />
                                    {t.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            {customTypes.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel>Custom (this project)</SelectLabel>
                                  {customTypes.map((t) => (
                                    <SelectItem key={t.constantName} value={t.constantName}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1.5">
                      {form.types.filter(Boolean).map((t) => (
                        <TypeBadge key={t} constant={t} />
                      ))}
                      {form.types.filter(Boolean).length === 0 && (
                        <span className="text-xs text-muted-foreground">No types selected.</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FieldLabel>Abilities (max 3)</FieldLabel>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="space-y-1">
                        <Select
                          value={form.abilities[i] ?? ""}
                          onValueChange={(v) => {
                            const next = [...form.abilities];
                            next[i] = v;
                            update("abilities", next.filter(Boolean));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Ability ${i + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Built-in</SelectLabel>
                              {BUILTIN_ABILITIES.map((a) => (
                                <SelectItem key={a.constant} value={a.constant}>
                                  {a.name}
                                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                    {a.constant}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            {customAbilities.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel>Custom (this project)</SelectLabel>
                                  {customAbilities.map((a) => (
                                    <SelectItem key={a.constantName} value={a.constantName}>
                                      {a.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <FieldLabel hint="0–255">Catch rate</FieldLabel>
                    <NumberField value={form.catchRate} onChange={(v) => update("catchRate", v ?? 0)} min={0} max={255} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="0–255">EXP yield</FieldLabel>
                    <NumberField value={form.expYield} onChange={(v) => update("expYield", v ?? 0)} min={0} max={255} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Gender ratio</FieldLabel>
                    <Select value={String(form.genderRatio)} onValueChange={(v) => update("genderRatio", Number(v))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_RATIOS.map((g) => (
                          <SelectItem key={g.constant} value={String(g.constant)}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="0–255">Egg cycles</FieldLabel>
                    <NumberField value={form.eggCycles} onChange={(v) => update("eggCycles", v ?? 0)} min={0} max={255} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="0–255">Friendship</FieldLabel>
                    <NumberField value={form.friendship} onChange={(v) => update("friendship", v ?? 0)} min={0} max={255} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Growth rate</FieldLabel>
                    <Select value={form.growthRate} onValueChange={(v) => update("growthRate", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROWTH_RATES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g.replace("GROWTH_", "").replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <FieldLabel>Egg group 1</FieldLabel>
                    <Select
                      value={form.eggGroups[0] ?? "EGG_GROUP_NONE"}
                      onValueChange={(v) => {
                        const next = [...form.eggGroups];
                        next[0] = v;
                        update("eggGroups", next.filter(Boolean));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EGG_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g.replace("EGG_GROUP_", "").replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Egg group 2</FieldLabel>
                    <Select
                      value={form.eggGroups[1] ?? "EGG_GROUP_NONE"}
                      onValueChange={(v) => {
                        const next = [...form.eggGroups];
                        next[1] = v;
                        update("eggGroups", next.filter(Boolean));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EGG_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g.replace("EGG_GROUP_", "").replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Body color</FieldLabel>
                    <Select value={form.bodyColor} onValueChange={(v) => update("bodyColor", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BODY_COLORS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("BODY_COLOR_", "").replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <FieldLabel hint="decimetres">Height</FieldLabel>
                    <NumberField value={form.height} onChange={(v) => update("height", v ?? 0)} min={0} max={9999} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="hectograms">Weight</FieldLabel>
                    <NumberField value={form.weight} onChange={(v) => update("weight", v ?? 0)} min={0} max={99999} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Don&apos;t flip sprite</FieldLabel>
                    <div className="flex h-9 items-center gap-2">
                      <Switch
                        checked={form.noFlip}
                        onCheckedChange={(c) => update("noFlip", c === true)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {form.noFlip ? "Yes (no flip)" : "No (default)"}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ===== Graphics ===== */}
              <TabsContent value="graphics" className="mt-0">
                <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
                  These fields map to <code className="font-mono">INCGFX_U32/U16/U8</code> macros in{" "}
                  <code className="font-mono">src/data/graphics/pokemon.h</code>. Leave symbol fields blank to use the
                  auto-generated defaults shown below.
                </div>

                <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Auto-generated symbol names (read-only)
                  </p>
                  <div className="grid gap-1 font-mono text-[11px] text-muted-foreground">
                    <div><span className="text-emerald-600 dark:text-emerald-400">frontPic:</span> gMonFrontPic_{pascal(form.constantName)}</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400">backPic:</span> gMonBackPic_{pascal(form.constantName)}</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400">palette:</span> gMonPalette_{pascal(form.constantName)}</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400">shinyPalette:</span> gMonShinyPalette_{pascal(form.constantName)}</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400">icon:</span> gMonIcon_{pascal(form.constantName)}</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400">footprint:</span> FOOTPRINT({pascal(form.constantName)})</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Front animation</FieldLabel>
                    <Select value={form.frontAnimId} onValueChange={(v) => update("frontAnimId", v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FRONT_ANIM_IDS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Back animation</FieldLabel>
                    <Select value={form.backAnimId} onValueChange={(v) => update("backAnimId", v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BACK_ANIM_IDS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <FieldLabel>Cry ID</FieldLabel>
                    <Select value={form.cryId} onValueChange={(v) => update("cryId", v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRY_IDS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <FieldLabel hint="px">Front W</FieldLabel>
                    <NumberField value={form.frontPicWidth} onChange={(v) => update("frontPicWidth", v ?? 64)} min={1} max={256} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="px">Front H</FieldLabel>
                    <NumberField value={form.frontPicHeight} onChange={(v) => update("frontPicHeight", v ?? 64)} min={1} max={256} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="px">Back W</FieldLabel>
                    <NumberField value={form.backPicWidth} onChange={(v) => update("backPicWidth", v ?? 64)} min={1} max={256} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel hint="px">Back H</FieldLabel>
                    <NumberField value={form.backPicHeight} onChange={(v) => update("backPicHeight", v ?? 64)} min={1} max={256} />
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-3 md:grid-cols-2">
                  {([
                    ["frontPicSymbol", "Front pic symbol"],
                    ["backPicSymbol", "Back pic symbol"],
                    ["iconSymbol", "Icon symbol"],
                    ["footprintSymbol", "Footprint symbol"],
                    ["paletteSymbol", "Palette symbol"],
                    ["shinyPaletteSymbol", "Shiny palette symbol"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <FieldLabel hint="optional">{label}</FieldLabel>
                      <Input
                        value={String(form[key] ?? "")}
                        onChange={(e) => update(key, e.target.value)}
                        placeholder={`auto (gMon…_${pascal(form.constantName)})`}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ===== Learnset ===== */}
              <TabsContent value="learnset" className="mt-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {form.learnsetMoves.length} move(s) — sorted by level on save.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update("learnsetMoves", [
                        ...form.learnsetMoves,
                        { level: 1, moveConstant: "MOVE_TACKLE" },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Add move
                  </Button>
                </div>

                {form.learnsetMoves.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No learnset moves yet. Click “Add move” to begin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.learnsetMoves.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-md border border-border bg-card/50 p-2"
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...form.learnsetMoves];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              update("learnsetMoves", next);
                            }}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            disabled={idx === form.learnsetMoves.length - 1}
                            onClick={() => {
                              const next = [...form.learnsetMoves];
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                              update("learnsetMoves", next);
                            }}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="w-16 shrink-0">
                          <Input
                            type="number"
                            value={m.level}
                            min={0}
                            max={100}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (Number.isNaN(n)) return;
                              const next = [...form.learnsetMoves];
                              next[idx] = { ...next[idx], level: Math.max(0, Math.min(100, n)) };
                              update("learnsetMoves", next);
                            }}
                            className="h-8 text-center"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <MoveCombobox
                            value={m.moveConstant}
                            customMoves={customMoves}
                            onChange={(v) => {
                              const next = [...form.learnsetMoves];
                              next[idx] = { ...next[idx], moveConstant: v };
                              update("learnsetMoves", next);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                          onClick={() => {
                            const next = form.learnsetMoves.filter((_, i) => i !== idx);
                            update("learnsetMoves", next);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== Evolutions ===== */}
              <TabsContent value="evolutions" className="mt-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {form.evolutions.length} evolution path(s).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update("evolutions", [
                        ...form.evolutions,
                        { method: "EVO_LEVEL", param: "36", targetSpecies: "" },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Add evolution
                  </Button>
                </div>

                {form.evolutions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No evolutions. Click “Add evolution” to define one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.evolutions.map((e, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card/50 p-2 sm:grid-cols-[1.2fr_1fr_1.4fr_auto]"
                      >
                        <div>
                          <FieldLabel>Method</FieldLabel>
                          <Select
                            value={e.method}
                            onValueChange={(v) => {
                              const next = [...form.evolutions];
                              next[idx] = { ...next[idx], method: v };
                              update("evolutions", next);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EVO_METHODS.map((m) => (
                                <SelectItem key={m.constant} value={m.constant}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <FieldLabel>Param</FieldLabel>
                          <Input
                            value={e.param}
                            onChange={(ev) => {
                              const next = [...form.evolutions];
                              next[idx] = { ...next[idx], param: ev.target.value };
                              update("evolutions", next);
                            }}
                            placeholder="36 / ITEM_… / etc."
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <FieldLabel>Target species</FieldLabel>
                          <Select
                            value={e.targetSpecies}
                            onValueChange={(v) => {
                              const next = [...form.evolutions];
                              next[idx] = { ...next[idx], targetSpecies: v };
                              update("evolutions", next);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="SPECIES_…" />
                            </SelectTrigger>
                            <SelectContent>
                              {allSpeciesConstants.map((c) => (
                                <SelectItem key={c} value={c}>
                                  <span className="font-mono text-xs">{c}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            onClick={() => {
                              const next = form.evolutions.filter((_, i) => i !== idx);
                              update("evolutions", next);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== Flags ===== */}
              <TabsContent value="flags" className="mt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  Toggle special classification flags for this species.
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  {SPECIES_FLAGS.map((f) => {
                    const checked = form.flags.includes(f.constant);
                    return (
                      <label
                        key={f.constant}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition-colors",
                          checked
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border bg-card hover:bg-accent/50",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...form.flags, f.constant]
                              : form.flags.filter((x) => x !== f.constant);
                            update("flags", next);
                          }}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-xs font-semibold">{f.name}</span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            .{f.constant}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Validation result panel */}
        {validation && validation.length > 0 && (
          <div className="max-h-40 overflow-y-auto custom-scroll border-t border-border bg-card/30 px-5 py-2">
            {errors.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Errors ({errors.length})
                </p>
                <ul className="space-y-0.5">
                  {errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-700 dark:text-red-300">
                      • {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Warnings ({warnings.length})
                </p>
                <ul className="space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                      • {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer */}
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={validateMut.isPending}
            >
              {validateMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Validate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3.5 w-3.5" /> Preview code
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isEdit ? "Save changes" : "Create Pokémon"}
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Code preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="font-mono text-sm">
              {form.constantName || "SPECIES_…"} · generated code
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste these snippets into the matching files in your pokeemerald-expansion checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {generatedCode.split("\n").length} lines
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedCode);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Copy failed — select manually");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <ScrollArea className="max-h-[65vh]">
            <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-foreground">
              {generatedCode}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helpers used by the editor
// ---------------------------------------------------------------------------
function pascal(constant: string): string {
  return constant
    .replace(/^SPECIES_/, "")
    .split(/_+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

// Used to detect if the user has manually edited the constant name
function suggestedPrev(name: string): string {
  return (
    "SPECIES_" +
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

export default SpeciesEditor;
