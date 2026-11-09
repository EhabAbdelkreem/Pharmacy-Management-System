import { BatchItem, Medicine, UnitType } from '../types/pharmacy';

/**
 * FEFO (First Expire, First Out) Allocation Engine
 * Sorts batches by expiry date ascending and returns the earliest expiring batch that has available stock.
 */
export function getFefoBatch(medicine: Medicine, unitType: UnitType, requestedQty = 1): BatchItem | null {
  if (!medicine.batches || medicine.batches.length === 0) {
    return null;
  }

  // Sort batches by expiry date ascending (earliest first)
  const sortedBatches = [...medicine.batches].sort((a, b) => {
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  // Find the first batch with available stock for requested unit
  for (const batch of sortedBatches) {
    if (unitType === 'Box') {
      if (batch.quantityBoxesAvailable >= requestedQty) {
        return batch;
      }
    } else {
      // Strip
      const totalStrips = (batch.quantityBoxesAvailable * medicine.unitsPerBox) + batch.quantityStripsAvailable;
      if (totalStrips >= requestedQty) {
        return batch;
      }
    }
  }

  // Fallback: return any earliest batch even if partial
  return sortedBatches[0] || null;
}

/**
 * Calculates remaining stock in total boxes and loose strips
 */
export function calculateTotalStock(medicine: Medicine) {
  let totalBoxes = 0;
  let totalStrips = 0;

  medicine.batches.forEach(b => {
    totalBoxes += b.quantityBoxesAvailable;
    totalStrips += b.quantityStripsAvailable;
  });

  const aggregateStrips = (totalBoxes * medicine.unitsPerBox) + totalStrips;
  return {
    totalBoxes,
    totalStrips,
    aggregateStrips,
    isLowStock: totalBoxes <= medicine.reorderLevel,
    isOutOfStock: aggregateStrips <= 0
  };
}

/**
 * Categorizes an expiry date into:
 * - 'Expired' (past date)
 * - 'Critical_3M' (less than 90 days)
 * - 'Warning_6M' (between 90 and 180 days)
 * - 'Good' (more than 180 days)
 */
export function getExpiryStatus(expiryDateStr: string): {
  status: 'Expired' | 'Critical_3M' | 'Warning_6M' | 'Good';
  daysRemaining: number;
  badgeColor: string;
  labelAr: string;
  labelEn: string;
} {
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'Expired',
      daysRemaining,
      badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
      labelAr: 'منتهي الصلاحية!',
      labelEn: 'Expired!'
    };
  } else if (daysRemaining <= 90) {
    return {
      status: 'Critical_3M',
      daysRemaining,
      badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      labelAr: `حرج (< ${daysRemaining} يوم)`,
      labelEn: `Critical (${daysRemaining}d)`
    };
  } else if (daysRemaining <= 180) {
    return {
      status: 'Warning_6M',
      daysRemaining,
      badgeColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
      labelAr: `تحذير (< 6 أشهر)`,
      labelEn: `Warning (< 6mo)`
    };
  } else {
    return {
      status: 'Good',
      daysRemaining,
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      labelAr: 'صالح وآمن',
      labelEn: 'Good'
    };
  }
}
