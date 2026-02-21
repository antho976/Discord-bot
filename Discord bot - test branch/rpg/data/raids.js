/**
 * Raids System - Tier 4
 * Group encounters with multiple bosses
 */

export const RAIDS = {
  world1: [
    {
      id: 'r1_1',
      name: 'Ragnarok\'s Edge Raid',
      description: 'Face the heralds of winter at the brink of Ragnarok.',
      world: 1,
      minLevel: 40,
      maxPartySize: 4,
      bosses: [
        {
          name: 'Frostbound Jarl',
          level: 40,
          hp: 950,
          xpReward: 1200,
        },
        {
          name: 'Jotun Warmonger',
          level: 44,
          hp: 1200,
          xpReward: 1500,
        },
        {
          name: 'Fenrir\'s Aspect',
          level: 48,
          hp: 1500,
          xpReward: 1900,
        },
      ],
      rewards: {
        xp: 5500,
        gold: 3000,
        loot: ['leviathan_axe', 'einherjar_plate', 'valkyrie_helm'],
      },
    },
    {
      id: 'r1_2',
      name: 'Siege of Olympus Raid',
      description: 'Ascend Olympus and challenge the war council of gods.',
      world: 1,
      minLevel: 50,
      maxPartySize: 5,
      bosses: [
        {
          name: 'Ares, God of War',
          level: 50,
          hp: 1800,
          xpReward: 2400,
        },
        {
          name: 'Athena, Shieldmaiden',
          level: 50,
          hp: 1650,
          xpReward: 2200,
        },
        {
          name: 'Zeus, Stormbearer',
          level: 50,
          hp: 2100,
          xpReward: 2800,
        },
      ],
      rewards: {
        xp: 8500,
        gold: 4500,
        loot: ['ares_blade', 'athena_spear', 'zeus_lightning_staff', 'spartan_cuirass'],
      },
    },
  ],
  world2: [
    {
      id: 'r2_1',
      name: 'Shadow Citadel Raid',
      description: 'A dangerous raid with 3 shadow bosses',
      world: 2,
      minLevel: 15,
      maxPartySize: 3,
      bosses: [
        {
          name: 'Shadow Knight',
          level: 15,
          hp: 450,
          xpReward: 500,
        },
        {
          name: 'Shadow Mage',
          level: 16,
          hp: 380,
          xpReward: 550,
        },
        {
          name: 'Shadow Lord',
          level: 18,
          hp: 550,
          xpReward: 700,
        },
      ],
      rewards: {
        xp: 1800,
        gold: 950,
        loot: ['mithril_blade', 'staff_wisdom'],
      },
    },
  ],
  world3: [
    {
      id: 'r3_1',
      name: 'Ancient Cathedral Raid',
      description: 'A challenging raid with ancient guardians',
      world: 3,
      minLevel: 25,
      maxPartySize: 4,
      bosses: [
        {
          name: 'Stone Guardian',
          level: 24,
          hp: 600,
          xpReward: 750,
        },
        {
          name: 'Crystal Protector',
          level: 26,
          hp: 550,
          xpReward: 800,
        },
        {
          name: 'Ancient Warden',
          level: 28,
          hp: 750,
          xpReward: 950,
        },
        {
          name: 'Cathedral Guardian',
          level: 30,
          hp: 900,
          xpReward: 1200,
        },
      ],
      rewards: {
        xp: 3800,
        gold: 1800,
        loot: ['mithril_plate'],
      },
    },
  ],
};

export function getRaidsByWorld(worldId) {
  const key = `world${worldId}`;
  const raids = RAIDS[key] || [];
  
  // Use existing floors if defined, otherwise calculate (+1 floor per 10 minLevel)
  return raids.map(raid => ({
    ...raid,
    floors: raid.floors ?? (1 + Math.floor(raid.minLevel / 10)),
  }));
}

export function getRaidById(raidId) {
  for (const raids of Object.values(RAIDS)) {
    const raid = raids.find(r => r.id === raidId);
    if (raid) {
      // Use existing floors if defined, otherwise calculate
      return {
        ...raid,
        floors: raid.floors ?? (1 + Math.floor(raid.minLevel / 10)),
      };
    }
  }
  return null;
}

export function getAvailableRaids(playerLevel, worldId) {
  return getRaidsByWorld(worldId).filter(r => playerLevel >= r.minLevel);
}
