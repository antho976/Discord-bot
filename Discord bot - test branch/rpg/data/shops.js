/**
 * Shop tiers unlocked by defense quests
 */

export const SHOP_TIERS = [
  {
    id: 'relief_camp',
    name: 'Relief Camp Supplies',
    unlockFlag: 'defense_millhaven',
    description: 'Emergency gear and potions for new defenders.',
    items: [
      { id: 'health_potion', price: 40 },
      { id: 'mana_potion', price: 35 },
      { id: 'leather_armor', price: 200 },
      { id: 'bronze_plate', price: 220 },
    ],
  },
  {
    id: 'harbor_market',
    name: 'Harbor Market',
    unlockFlag: 'defense_shadowport',
    description: 'Smuggler-grade steel and coastal provisions.',
    items: [
      { id: 'steel_longsword', price: 520 },
      { id: 'iron_plate', price: 420 },
      { id: 'mana_potion', price: 30 },
      { id: 'health_potion', price: 35 },
    ],
  },
  {
    id: 'arcane_bazaar',
    name: 'Arcane Bazaar',
    unlockFlag: 'defense_arcane_tower',
    description: 'Magical implements and rare resources.',
    items: [
      { id: 'staff_wisdom', price: 1400 },
      { id: 'mana_potion', price: 28 },
      { id: 'arcane_essence', price: 380 },
      { id: 'mana_crystal', price: 260 },
    ],
  },
  {
    id: 'dragon_forge',
    name: 'Dragon Forge',
    unlockFlag: 'defense_drakehollow',
    description: 'Legendary gear forged with draconic materials.',
    items: [
      { id: 'mithril_blade', price: 1800 },
      { id: 'adamantite', price: 520 },
      { id: 'dragonstone', price: 750 },
      { id: 'phoenix_feather', price: 650 },
    ],
  },
];

export function getUnlockedShopTiers(player) {
  return SHOP_TIERS.filter(tier => player.hasQuestFlag(tier.unlockFlag));
}
