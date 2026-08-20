// Seed script — creates a demo project with sample custom content
// Run with: bun run scripts/seed.ts
import { db } from "../src/lib/db";

async function main() {
  await db.buildCheck.deleteMany();
  await db.backup.deleteMany();
  await db.changePlan.deleteMany();
  await db.levelUpMove.deleteMany();
  await db.evolution.deleteMany();
  await db.species.deleteMany();
  await db.move.deleteMany();
  await db.type.deleteMany();
  await db.ability.deleteMany();
  await db.item.deleteMany();
  await db.statusCondition.deleteMany();
  await db.project.deleteMany();

  const project = await db.project.create({
    data: {
      name: "Axolote Demo Hack",
      description: "Sample project showcasing PokeForge's custom-content workflow.",
      basePath: "~/code/pokeemerald-expansion",
      expansionVersion: "1.15.2",
      nextSpeciesId: 1526,
      nextMoveId: 921,
      nextTypeId: 21,
      nextAbilityId: 301,
      nextItemId: 5010,
      nextStatusId: 9,
    },
  });
  console.log("Project:", project.id);

  const cosmic = await db.type.create({
    data: {
      projectId: project.id,
      constantName: "TYPE_COSMIC",
      typeId: 20,
      name: "Cosmic",
      description: "A type from beyond the stars. Strong against Psychic and Dragon.",
      colorHex: "#9333EA",
      iconEmoji: "🌌",
      offensiveMatrix: JSON.stringify({
        TYPE_PSYCHIC: 2, TYPE_DRAGON: 2, TYPE_STEEL: 0.5, TYPE_DARK: 0.5,
      }),
      defensiveMatrix: JSON.stringify({
        TYPE_DARK: 2, TYPE_GHOST: 2, TYPE_PSYCHIC: 0.5, TYPE_FAIRY: 0.5,
      }),
    },
  });
  console.log("Type:", cosmic.constantName);

  const starcaller = await db.ability.create({
    data: {
      projectId: project.id,
      constantName: "ABILITY_STARCALLER",
      abilityId: 300,
      name: "Starcaller",
      description: "Boosts the power of Cosmic-type moves by 50%.",
      effectFlags: JSON.stringify(["ABILITY_FLAG_TYPE_BOOST"]),
      battleScript: "BattleScript_AbilityStarcaller",
    },
  });
  console.log("Ability:", starcaller.constantName);

  const nebulaStrike = await db.move.create({
    data: {
      projectId: project.id,
      constantName: "MOVE_NEBULA_STRIKE",
      moveId: 920,
      name: "Nebula Strike",
      description: "The user fires a beam of cosmic energy. May lower the target's Sp. Def.",
      effect: "EFFECT_SP_DEF_DOWN",
      power: 90,
      type: "TYPE_COSMIC",
      category: "CATEGORY_SPECIAL",
      target: "MOVE_TARGET_SELECTED",
      pp: 10,
      accuracy: 100,
      priority: 0,
      critStage: 0,
      flags: JSON.stringify(["MOVE_FLAG_MAKES_CONTACT", "MOVE_FLAG_PROTECT_AFFECTED", "MOVE_FLAG_MIRROR_MOVE_AFFECTED"]),
      battleScript: "BattleScript_NebulaStrike",
    },
  });
  console.log("Move:", nebulaStrike.constantName);

  const stardustOrb = await db.item.create({
    data: {
      projectId: project.id,
      constantName: "ITEM_STARDUST_ORB",
      itemId: 5001,
      name: "Stardust Orb",
      description: "A glowing orb that boosts Cosmic-type moves. Holdable.",
      pocket: "POCKET_ITEMS",
      price: 4000,
      effect: "ITEM_EFFECT_HOLD",
      holdEffect: "HOLD_EFFECT_TYPE_BOOST",
      flingPower: 30,
      importance: 0,
      category: "ITEM_CATEGORY_ITEMS",
      isTM: false,
    },
  });
  console.log("Item:", stardustOrb.constantName);

  const starstruck = await db.statusCondition.create({
    data: {
      projectId: project.id,
      constantName: "STATUS_STARSTRUCK",
      statusId: 8,
      name: "Starstruck",
      description: "The Pokémon is dazed by cosmic light. Evasion reduced each turn.",
      category: "volatile",
      isVolatile: true,
      battleScript: "BattleScript_StarstruckApply",
      iconEmoji: "✨",
      colorHex: "#A855F7",
    },
  });
  console.log("Status:", starstruck.constantName);

  const stelluxe = await db.species.create({
    data: {
      projectId: project.id,
      constantName: "SPECIES_STELLUXE",
      speciesId: 1524,
      speciesName: "Stelluxe",
      nationalDexNum: 1524,
      hoennDexNum: 411,
      categoryName: "Nebula",
      description: "Born from the heart of a dying star, Stelluxe drifts through space absorbing cosmic energy. Its glow can be seen from miles away.",
      baseHP: 95, baseAttack: 60, baseDefense: 85, baseSpeed: 105,
      baseSpAttack: 130, baseSpDefense: 110,
      evYieldHP: 0, evYieldAttack: 0, evYieldDefense: 0,
      evYieldSpeed: 0, evYieldSpAttack: 3, evYieldSpDefense: 0,
      types: JSON.stringify(["TYPE_COSMIC", "TYPE_PSYCHIC"]),
      catchRate: 3,
      expYield: 255,
      genderRatio: 255,
      eggCycles: 120,
      friendship: 0,
      growthRate: "GROWTH_SLOW",
      eggGroups: JSON.stringify(["EGG_GROUP_NO_EGGS_DISCOVERABLE", "EGG_GROUP_NONE"]),
      abilities: JSON.stringify(["ABILITY_STARCALLER", "ABILITY_LEVITATE", "ABILITY_NONE"]),
      bodyColor: "BODY_COLOR_PURPLE",
      noFlip: false,
      height: 12,
      weight: 450,
      frontAnimId: "ANIM_V_JOLT",
      backAnimId: "BACK_ANIM_CONCAVE_ARC_SMALL",
      frontPicWidth: 64, frontPicHeight: 64,
      backPicWidth: 64, backPicHeight: 64,
      cryId: "CRY_MEW",
      flags: JSON.stringify(["isMythical"]),
      learnsetMoves: {
        create: [
          { level: 1, moveConstant: "MOVE_CONFUSION" },
          { level: 1, moveConstant: "MOVE_NEBULA_STRIKE" },
          { level: 8, moveConstant: "MOVE_PSYBEAM" },
          { level: 16, moveConstant: "MOVE_LIGHT_SCREEN" },
          { level: 24, moveConstant: "MOVE_PSYCHIC" },
          { level: 32, moveConstant: "MOVE_CALM_MIND" },
          { level: 40, moveConstant: "MOVE_RECOVER" },
          { level: 48, moveConstant: "MOVE_FUTURE_SIGHT" },
          { level: 56, moveConstant: "MOVE_NEBULA_STRIKE" },
        ],
      },
      evolutions: { create: [] },
    },
  });
  console.log("Species:", stelluxe.constantName);

  const embrix = await db.species.create({
    data: {
      projectId: project.id,
      constantName: "SPECIES_EMBRIX",
      speciesId: 1525,
      speciesName: "Embrix",
      nationalDexNum: 1525,
      categoryName: "Ember",
      description: "A small lizard whose tail-flame burns hotter when it is happy.",
      baseHP: 45, baseAttack: 65, baseDefense: 40, baseSpeed: 70,
      baseSpAttack: 60, baseSpDefense: 40,
      evYieldHP: 0, evYieldAttack: 0, evYieldDefense: 0,
      evYieldSpeed: 1, evYieldSpAttack: 0, evYieldSpDefense: 0,
      types: JSON.stringify(["TYPE_FIRE"]),
      catchRate: 45,
      expYield: 62,
      genderRatio: 31,
      eggCycles: 20,
      friendship: 70,
      growthRate: "GROWTH_MEDIUM_SLOW",
      eggGroups: JSON.stringify(["EGG_GROUP_MONSTER", "EGG_GROUP_DRAGON"]),
      abilities: JSON.stringify(["ABILITY_BLAZE", "ABILITY_SOLAR_POWER", "ABILITY_NONE"]),
      bodyColor: "BODY_COLOR_RED",
      noFlip: false,
      height: 6,
      weight: 85,
      frontAnimId: "ANIM_V_SHAKE",
      backAnimId: "BACK_ANIM_H_SLIDE",
      frontPicWidth: 64, frontPicHeight: 64,
      backPicWidth: 64, backPicHeight: 64,
      cryId: "CRY_CHARMANDER",
      flags: JSON.stringify([]),
      learnsetMoves: {
        create: [
          { level: 1, moveConstant: "MOVE_SCRATCH" },
          { level: 1, moveConstant: "MOVE_EMBER" },
          { level: 7, moveConstant: "MOVE_GROWL" },
          { level: 10, moveConstant: "MOVE_FLAME_WHEEL" },
          { level: 16, moveConstant: "MOVE_BITE" },
          { level: 22, moveConstant: "MOVE_FLAMETHROWER" },
        ],
      },
      evolutions: {
        create: [
          { method: "EVO_LEVEL", param: "16", targetSpecies: "SPECIES_STELLUXE" },
        ],
      },
    },
  });
  console.log("Species:", embrix.constantName);

  const [species, moves, types, abilities, items, statuses] = await Promise.all([
    db.species.findMany({ where: { projectId: project.id }, include: { learnsetMoves: true, evolutions: true } }),
    db.move.findMany({ where: { projectId: project.id } }),
    db.type.findMany({ where: { projectId: project.id } }),
    db.ability.findMany({ where: { projectId: project.id } }),
    db.item.findMany({ where: { projectId: project.id } }),
    db.statusCondition.findMany({ where: { projectId: project.id } }),
  ]);
  await db.backup.create({
    data: {
      projectId: project.id,
      label: "Seed snapshot (demo content)",
      snapshotJson: JSON.stringify({ species, moves, types, abilities, items, statuses }),
      sizeBytes: 0,
    },
  });

  console.log("\n✅ Seed complete. Demo project:", project.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
