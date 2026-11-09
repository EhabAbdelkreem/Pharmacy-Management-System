import { CartItem, DrugInteraction, InteractionSeverity } from '../types/pharmacy';
import { DRUG_INTERACTIONS } from '../data/mockData';

export interface DetectedConflict {
  interaction: DrugInteraction;
  cartItem1: CartItem;
  cartItem2: CartItem;
}

/**
 * Checks all cart items against pairwise drug interactions.
 */
export function detectDrugInteractions(cartItems: CartItem[]): DetectedConflict[] {
  if (cartItems.length < 2) return [];

  const conflicts: DetectedConflict[] = [];

  for (let i = 0; i < cartItems.length; i++) {
    for (let j = i + 1; j < cartItems.length; j++) {
      const itemA = cartItems[i];
      const itemB = cartItems[j];

      const ingA_en = itemA.medicine.activeIngredientEn.toLowerCase();
      const ingB_en = itemB.medicine.activeIngredientEn.toLowerCase();

      // Check against interaction database
      for (const interaction of DRUG_INTERACTIONS) {
        const i1 = interaction.ingredient1En.toLowerCase();
        const i2 = interaction.ingredient2En.toLowerCase();

        const matchDirect = ingA_en.includes(i1) && ingB_en.includes(i2);
        const matchReverse = ingA_en.includes(i2) && ingB_en.includes(i1);

        if (matchDirect || matchReverse) {
          conflicts.push({
            interaction,
            cartItem1: itemA,
            cartItem2: itemB
          });
        }
      }
    }
  }

  return conflicts;
}

export function getSeverityBadgeStyle(severity: InteractionSeverity) {
  switch (severity) {
    case 'Fatal':
      return {
        bg: 'bg-red-600',
        text: 'text-white',
        border: 'border-red-700',
        ring: 'ring-red-400',
        iconColor: 'text-red-200'
      };
    case 'Severe':
      return {
        bg: 'bg-orange-600',
        text: 'text-white',
        border: 'border-orange-700',
        ring: 'ring-orange-400',
        iconColor: 'text-orange-200'
      };
    case 'Moderate':
      return {
        bg: 'bg-amber-500',
        text: 'text-white',
        border: 'border-amber-600',
        ring: 'ring-amber-300',
        iconColor: 'text-amber-100'
      };
    default:
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-700',
        ring: 'ring-blue-300',
        iconColor: 'text-blue-100'
      };
  }
}
