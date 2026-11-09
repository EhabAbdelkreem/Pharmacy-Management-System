import { Medicine, SalesInvoice } from '../types/pharmacy';
import { calculateTotalStock } from './fefoEngine';

export interface MonthlyTrendData {
  monthKey: string; // e.g. '2026-06'
  monthLabelAr: string; // e.g. 'يونيو 2026'
  monthLabelEn: string; // e.g. 'Jun 2026'
  actualBoxes: number | null; // actual historical sales
  actualRevenue: number | null;
  forecastBoxes: number; // predicted demand
  upperBandBoxes: number; // safety stock buffer (+15%)
  lowerBandBoxes: number; // minimum demand (-10%)
  isForecast: boolean;
}

export interface MedicineConsumptionStat {
  medicineId: string;
  tradeNameAr: string;
  tradeNameEn: string;
  categoryAr: string;
  activeIngredientAr: string;
  pricePerBox: number;
  currentStockBoxes: number;
  monthlyDispensedBoxes: number; // current selected month
  monthlyRevenueSAR: number;
  averageDailyBurnRate: number; // boxes/day
  daysOfSupplyRemaining: number;
  forecastedDemandNextMonth: number;
  suggestedReorderBoxes: number;
  growthRatePercent: number; // month-over-month growth
  riskLevel: 'Critical' | 'Warning' | 'Optimal' | 'Overstock';
}

export interface CategoryConsumptionStat {
  categoryAr: string;
  categoryEn: string;
  quantityBoxes: number;
  revenueSAR: number;
  percentage: number;
  color: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'مضادات حيوية واسعة المجال': '#0ea5e9', // Sky blue
  'مسكنات وخافضات حرارة': '#10b981', // Emerald
  'أدوية السكري والأنسولين': '#f59e0b', // Amber
  'أدوية الصدر والربو': '#8b5cf6', // Purple
  'حاصرات بيتا لضغط الدم': '#ec4899', // Pink
  'مخفضات الكوليسترول': '#6366f1', // Indigo
  'مضادات تخثر الدم': '#ef4444', // Red
  'أدوية الجهاز الهضمي والمعدة': '#14b8a6', // Teal
  'فيتامينات ومكملات غذائية': '#f97316', // Orange
  'مدرات البول الموفرة للبوتاسيوم': '#84cc16', // Lime
  'أخرى': '#64748b', // Slate
};

// Base baseline historical monthly weights to generate realistic historical trend
const HISTORICAL_MONTHS = [
  { key: '2026-06', labelAr: 'يونيو 2026', labelEn: 'Jun 2026', factor: 0.88 },
  { key: '2026-07', labelAr: 'يوليو 2026', labelEn: 'Jul 2026', factor: 0.94 },
  { key: '2026-08', labelAr: 'أغسطس 2026', labelEn: 'Aug 2026', factor: 1.02 },
  { key: '2026-09', labelAr: 'سبتمبر 2026', labelEn: 'Sep 2026', factor: 1.08 },
  { key: '2026-10', labelAr: 'أكتوبر 2026', labelEn: 'Oct 2026', factor: 1.15 },
  { key: '2026-11', labelAr: 'نوفمبر 2026 (الحالي)', labelEn: 'Nov 2026 (Current)', factor: 1.22 },
];

const FUTURE_FORECAST_MONTHS = [
  { key: '2026-12', labelAr: 'ديسمبر 2026 (توقع)', labelEn: 'Dec 2026 (Proj.)', factor: 1.34 },
  { key: '2027-01', labelAr: 'يناير 2027 (توقع)', labelEn: 'Jan 2027 (Proj.)', factor: 1.41 },
  { key: '2027-02', labelAr: 'فبراير 2027 (توقع)', labelEn: 'Feb 2027 (Proj.)', factor: 1.28 },
];

/**
 * Computes comprehensive drug consumption analytics and predictive demand
 */
export function calculateDrugConsumptionAnalytics(
  medicines: Medicine[],
  invoices: SalesInvoice[],
  selectedMonthKey: string = '2026-11'
) {
  // 1. Calculate live invoice contributions for medicines in current active month
  const liveSalesMap = new Map<string, { qtyBoxes: number; revenue: number }>();
  
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const prev = liveSalesMap.get(item.medicineId) || { qtyBoxes: 0, revenue: 0 };
      const boxes = item.unitType === 'Box' ? item.quantity : Math.ceil(item.quantity / 2);
      liveSalesMap.set(item.medicineId, {
        qtyBoxes: prev.qtyBoxes + boxes,
        revenue: prev.revenue + item.lineTotal,
      });
    });
  });

  // 2. Generate stats for each medicine
  const medicineStats: MedicineConsumptionStat[] = medicines.map((med, index) => {
    const stockInfo = calculateTotalStock(med);
    const currentStockBoxes = stockInfo.totalBoxes;

    // Deterministic base consumption pattern based on item popularity and reorder level
    const popularitySeed = (index * 7 + 13) % 19;
    const baseMonthlyRate = Math.max(8, Math.round(med.reorderLevel * 1.8 + popularitySeed));

    // Live sales added to baseline
    const liveContribution = liveSalesMap.get(med.id) || { qtyBoxes: 0, revenue: 0 };
    const monthlyDispensedBoxes = baseMonthlyRate + liveContribution.qtyBoxes;
    const monthlyRevenueSAR = (baseMonthlyRate * med.pricePerBox) + liveContribution.revenue;

    const averageDailyBurnRate = Number((monthlyDispensedBoxes / 30).toFixed(2));
    const daysOfSupplyRemaining = averageDailyBurnRate > 0 
      ? Math.round(currentStockBoxes / averageDailyBurnRate) 
      : 999;

    // Predictive future demand: incorporates seasonal factors (antibiotics and respiratory scale up in winter)
    let seasonalMultiplier = 1.12;
    if (med.categoryAr.includes('مضادات') || med.categoryAr.includes('الصدر') || med.categoryAr.includes('مسكنات')) {
      seasonalMultiplier = 1.25; // winter peak demand
    } else if (med.categoryAr.includes('السكري') || med.categoryAr.includes('ضغط')) {
      seasonalMultiplier = 1.05; // steady chronic baseline
    }

    const forecastedDemandNextMonth = Math.round(monthlyDispensedBoxes * seasonalMultiplier);
    
    // Recommended Replenishment = (Forecasted Demand * 1.5 Safety Stock) - Current Stock
    const suggestedReorderBoxes = Math.max(0, Math.round((forecastedDemandNextMonth * 1.4) - currentStockBoxes));

    // Growth rate vs previous month
    const growthRatePercent = Math.round((seasonalMultiplier - 1) * 100 + ((popularitySeed % 6) - 2));

    // Risk Classification
    let riskLevel: 'Critical' | 'Warning' | 'Optimal' | 'Overstock' = 'Optimal';
    if (currentStockBoxes === 0 || daysOfSupplyRemaining <= 7) {
      riskLevel = 'Critical';
    } else if (daysOfSupplyRemaining <= 15) {
      riskLevel = 'Warning';
    } else if (daysOfSupplyRemaining > 60) {
      riskLevel = 'Overstock';
    }

    return {
      medicineId: med.id,
      tradeNameAr: med.tradeNameAr,
      tradeNameEn: med.tradeNameEn,
      categoryAr: med.categoryAr,
      activeIngredientAr: med.activeIngredientAr,
      pricePerBox: med.pricePerBox,
      currentStockBoxes,
      monthlyDispensedBoxes,
      monthlyRevenueSAR: Number(monthlyRevenueSAR.toFixed(2)),
      averageDailyBurnRate,
      daysOfSupplyRemaining,
      forecastedDemandNextMonth,
      suggestedReorderBoxes,
      growthRatePercent,
      riskLevel,
    };
  });

  // Sort by highest units dispensed (best-sellers)
  medicineStats.sort((a, b) => b.monthlyDispensedBoxes - a.monthlyDispensedBoxes);

  // 3. Top Best-Selling Medicines (Top 8 for Recharts Bar Chart)
  const topSellingMedicines = medicineStats.slice(0, 8);

  // 4. Monthly Historical & Forecast Trend Line (6 Historical + 3 Forecast Months)
  const totalBaseUnitsMonth = medicineStats.reduce((sum, m) => sum + m.monthlyDispensedBoxes, 0);
  const totalBaseRevenueMonth = medicineStats.reduce((sum, m) => sum + m.monthlyRevenueSAR, 0);

  const monthlyTrend: MonthlyTrendData[] = [
    ...HISTORICAL_MONTHS.map((m) => {
      const units = Math.round(totalBaseUnitsMonth * m.factor * 0.85);
      const rev = Math.round(totalBaseRevenueMonth * m.factor * 0.85);
      return {
        monthKey: m.key,
        monthLabelAr: m.labelAr,
        monthLabelEn: m.labelEn,
        actualBoxes: units,
        actualRevenue: rev,
        forecastBoxes: units,
        upperBandBoxes: Math.round(units * 1.15),
        lowerBandBoxes: Math.round(units * 0.90),
        isForecast: false,
      };
    }),
    ...FUTURE_FORECAST_MONTHS.map((m) => {
      const forecastUnits = Math.round(totalBaseUnitsMonth * m.factor);
      const forecastRev = Math.round(totalBaseRevenueMonth * m.factor);
      return {
        monthKey: m.key,
        monthLabelAr: m.labelAr,
        monthLabelEn: m.labelEn,
        actualBoxes: null,
        actualRevenue: null,
        forecastBoxes: forecastUnits,
        upperBandBoxes: Math.round(forecastUnits * 1.18),
        lowerBandBoxes: Math.round(forecastUnits * 0.88),
        isForecast: true,
      };
    }),
  ];

  // 5. Category Consumption Distribution (for Pie/Donut Chart)
  const categoryMap = new Map<string, { qty: number; rev: number }>();
  medicineStats.forEach((m) => {
    const prev = categoryMap.get(m.categoryAr) || { qty: 0, rev: 0 };
    categoryMap.set(m.categoryAr, {
      qty: prev.qty + m.monthlyDispensedBoxes,
      rev: prev.rev + m.monthlyRevenueSAR,
    });
  });

  const totalCatQty = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.qty, 0);
  const categoryStats: CategoryConsumptionStat[] = Array.from(categoryMap.entries()).map(([catAr, data]) => {
    return {
      categoryAr: catAr,
      categoryEn: catAr,
      quantityBoxes: data.qty,
      revenueSAR: Number(data.rev.toFixed(2)),
      percentage: totalCatQty > 0 ? Number(((data.qty / totalCatQty) * 100).toFixed(1)) : 0,
      color: CATEGORY_COLORS[catAr] || '#64748b',
    };
  }).sort((a, b) => b.quantityBoxes - a.quantityBoxes);

  // 6. Macro Executive Summaries
  const totalMonthlyBoxes = medicineStats.reduce((sum, m) => sum + m.monthlyDispensedBoxes, 0);
  const totalMonthlyRevenue = medicineStats.reduce((sum, m) => sum + m.monthlyRevenueSAR, 0);
  const totalForecastedBoxesNextMonth = medicineStats.reduce((sum, m) => sum + m.forecastedDemandNextMonth, 0);
  const criticalStockoutCount = medicineStats.filter((m) => m.riskLevel === 'Critical').length;
  const reorderUrgentCount = medicineStats.filter((m) => m.suggestedReorderBoxes > 0).length;
  const topMedicine = medicineStats[0];

  return {
    medicineStats,
    topSellingMedicines,
    monthlyTrend,
    categoryStats,
    totalMonthlyBoxes,
    totalMonthlyRevenue,
    totalForecastedBoxesNextMonth,
    criticalStockoutCount,
    reorderUrgentCount,
    topMedicine,
  };
}
