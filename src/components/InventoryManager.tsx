import React, { useState } from 'react';
import { Medicine, BatchItem, DosageForm } from '../types/pharmacy';
import { calculateTotalStock, getExpiryStatus } from '../services/fefoEngine';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  DollarSign,
  TrendingDown,
  CheckCircle2,
  AlertOctagon,
  FileSpreadsheet,
  Zap,
  Copy,
  Check,
  PackageX,
  Gauge,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Truck,
  Building,
  CheckCheck,
  Lock
} from 'lucide-react';

interface InventoryManagerProps {
  medicines: Medicine[];
  onAddBatch: (medicineId: string, newBatch: Omit<BatchItem, 'id' | 'medicineId'>) => void;
  lang: 'ar' | 'en';
  canViewCost?: boolean;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  medicines,
  onAddBatch,
  lang,
  canViewCost = true,
}) => {
  const isAr = lang === 'ar';

  // Sub-tabs: 'dashboard' (Low Stock Dashboard) vs 'catalog' (Full Inventory & Batches)
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'catalog'>('dashboard');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expiringSoon' | 'lowStock' | 'rxOnly'>('all');
  const [dashboardSeverityFilter, setDashboardSeverityFilter] = useState<'all' | 'zero' | 'critical' | 'warning'>('all');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // New batch modal state
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [targetMedicine, setTargetMedicine] = useState<Medicine | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('10.00');
  const [quantityBoxes, setQuantityBoxes] = useState('20');
  const [shelfLocation, setShelfLocation] = useState('A-02-Mid');

  // Purchase Order Generation Modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [copiedPo, setCopiedPo] = useState(false);

  // Success notice state for recommendations
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // 1. Calculate items requiring restock based on ReorderLevel
  const lowStockItems = medicines.map((med) => {
    const stock = calculateTotalStock(med);
    const reorderLevel = med.reorderLevel;
    const currentBoxes = stock.totalBoxes;
    const isUnderReorder = currentBoxes <= reorderLevel;
    const deficitBoxes = Math.max(0, reorderLevel - currentBoxes);

    // Recommended order quantity (e.g. to achieve 2x reorder safety stock)
    const suggestedRestockQty = Math.max(reorderLevel * 2 - currentBoxes, reorderLevel);

    // Estimated unit cost from latest batch or default 70% of price
    const latestCost = med.batches.length > 0 ? med.batches[0].costPrice : med.pricePerBox * 0.7;
    const estimatedRestockCost = suggestedRestockQty * latestCost;

    // Severity category
    let severity: 'Zero' | 'Critical' | 'Warning' | 'Healthy' = 'Healthy';
    if (currentBoxes === 0) {
      severity = 'Zero';
    } else if (currentBoxes <= Math.ceil(reorderLevel * 0.4)) {
      severity = 'Critical';
    } else if (isUnderReorder) {
      severity = 'Warning';
    }

    const stockRatio = reorderLevel > 0 ? Math.min(100, Math.round((currentBoxes / reorderLevel) * 100)) : 100;

    return {
      medicine: med,
      stock,
      reorderLevel,
      currentBoxes,
      isUnderReorder,
      deficitBoxes,
      suggestedRestockQty,
      latestCost,
      estimatedRestockCost,
      severity,
      stockRatio,
    };
  }).filter((item) => item.isUnderReorder);

  // Sort by urgency: Zero first, then lowest stock ratio
  lowStockItems.sort((a, b) => {
    if (a.currentBoxes === 0 && b.currentBoxes > 0) return -1;
    if (b.currentBoxes === 0 && a.currentBoxes > 0) return 1;
    return a.stockRatio - b.stockRatio;
  });

  // Filtered Low Stock items for the Dashboard
  const filteredDashboardItems = lowStockItems.filter((item) => {
    const matchesSearch =
      item.medicine.tradeNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medicine.tradeNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medicine.activeIngredientEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medicine.barcode.includes(searchQuery);

    if (!matchesSearch) return false;

    if (dashboardSeverityFilter === 'zero') return item.severity === 'Zero';
    if (dashboardSeverityFilter === 'critical') return item.severity === 'Critical';
    if (dashboardSeverityFilter === 'warning') return item.severity === 'Warning';
    return true;
  });

  // Filtered medicines for the general catalog view
  const filteredCatalogMedicines = medicines.filter((m) => {
    const stock = calculateTotalStock(m);
    const matchesSearch =
      m.tradeNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tradeNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.activeIngredientEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.barcode.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterType === 'lowStock') {
      return stock.isLowStock;
    }
    if (filterType === 'rxOnly') {
      return m.requiresPrescription;
    }
    if (filterType === 'expiringSoon') {
      return m.batches.some((b) => {
        const info = getExpiryStatus(b.expiryDate);
        return info.status === 'Expired' || info.status === 'Critical_3M' || info.status === 'Warning_6M';
      });
    }

    return true;
  });

  // System stats
  const totalSkuCount = medicines.length;
  let totalInventoryBoxes = 0;
  let totalCriticalBatches = 0;

  medicines.forEach((m) => {
    const stock = calculateTotalStock(m);
    totalInventoryBoxes += stock.totalBoxes;
    m.batches.forEach((b) => {
      const exp = getExpiryStatus(b.expiryDate);
      if (exp.status === 'Expired' || exp.status === 'Critical_3M') {
        totalCriticalBatches++;
      }
    });
  });

  // Dashboard Aggregates
  const totalRestockItemsCount = lowStockItems.length;
  const zeroStockCount = lowStockItems.filter((i) => i.severity === 'Zero').length;
  const criticalStockCount = lowStockItems.filter((i) => i.severity === 'Critical').length;
  const totalDeficitBoxes = lowStockItems.reduce((acc, i) => acc + i.deficitBoxes, 0);
  const totalEstimatedRestockBudget = lowStockItems.reduce((acc, i) => acc + i.estimatedRestockCost, 0);

  // Trigger quick restock modal with prefilled data
  const handleOpenQuickRestock = (med: Medicine, suggestedQty: number, cost: number) => {
    setTargetMedicine(med);
    setBatchNumber(`BCH-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
    
    // Default expiry 2 years from today
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 2);
    setExpiryDate(exp.toISOString().split('T')[0]);
    
    setCostPrice(cost.toFixed(2));
    setQuantityBoxes(String(suggestedQty));
    setShelfLocation(med.batches.length > 0 ? med.batches[0].shelfLocation : 'A-01-Main');
    setShowAddBatchModal(true);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMedicine || !batchNumber || !expiryDate) return;

    onAddBatch(targetMedicine.id, {
      batchNumber,
      manufactureDate: new Date().toISOString().split('T')[0],
      expiryDate,
      costPrice: parseFloat(costPrice) || targetMedicine.pricePerBox * 0.7,
      sellingPriceBox: targetMedicine.pricePerBox,
      sellingPriceStrip: targetMedicine.pricePerStrip,
      quantityBoxesAvailable: parseInt(quantityBoxes) || 10,
      quantityStripsAvailable: 0,
      shelfLocation: shelfLocation || 'A-01',
    });

    setShowAddBatchModal(false);
    setBatchNumber('');
    setExpiryDate('');
    setAppliedNotice(isAr ? `تم تسجيل توريد الدواء (${targetMedicine.tradeNameAr}) وتحديث المخزون بنجاح!` : `Restock batch registered successfully!`);
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  const handleCopyPoText = () => {
    const lines = [
      `مسودة أمر شراء وتوريد نواقص صيدلية فارماكور - ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}`,
      `عدد الأصناف المطلوبة: ${lowStockItems.length}`,
      `تقدير التكلفة الإجمالية: ${totalEstimatedRestockBudget.toFixed(2)} SAR`,
      '-------------------------------------------------------',
      ...lowStockItems.map(
        (item, idx) =>
          `${idx + 1}. [${item.medicine.barcode}] ${item.medicine.tradeNameAr} (${item.medicine.tradeNameEn}) | الرصيد الحالي: ${item.currentBoxes} | حد الطلب: ${item.reorderLevel} | الكمية المقترحة: ${item.suggestedRestockQty} علبة | التكلفة التقديرية: ${item.estimatedRestockCost.toFixed(2)} SAR`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPo(true);
    setTimeout(() => setCopiedPo(false), 2500);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Success Notification Alerts */}
      {appliedNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{appliedNotice}</span>
          </div>
          <button
            onClick={() => setAppliedNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* View Switcher: Low Stock Dashboard vs Catalog View */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex-1 sm:flex-none ${
              activeSubTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{isAr ? 'لوحة متابعة النواقص (Dashboard)' : 'Low Stock Dashboard'}</span>
            {totalRestockItemsCount > 0 && (
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-xs font-mono font-bold">
                {totalRestockItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex-1 sm:flex-none ${
              activeSubTab === 'catalog'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{isAr ? 'كتالوج المخزون وشحنات FEFO' : 'All Inventory & Batches'}</span>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md text-xs font-mono">
              {totalSkuCount}
            </span>
          </button>
        </div>

        {/* Action Controls for Dashboard */}
        {activeSubTab === 'dashboard' && totalRestockItemsCount > 0 && (
          <button
            onClick={() => setShowPoModal(true)}
            className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? 'توليد مسودة أمر شراء النواقص (PO)' : 'Generate Restock PO'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. LOW STOCK DASHBOARD VIEW                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Executive KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Depleted Items */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  {isAr ? 'أدوية نافدة تماماً (رصيد 0)' : 'Out of Stock (Zero Units)'}
                </span>
                <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 block">
                  {zeroStockCount} {isAr ? 'أصناف' : 'SKUs'}
                </span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">
                  {zeroStockCount > 0 ? (isAr ? 'تتطلب توريداً فورياً عاجلاً' : 'Immediate supplier order needed') : (isAr ? 'لا يوجد نفاد تام' : 'No zero stock')}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
                <PackageX className="w-6 h-6" />
              </div>
            </div>

            {/* Total Items below Reorder Level */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  {isAr ? 'أصناف تحت حد إعادة الطلب' : 'Under Reorder Level'}
                </span>
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 block">
                  {totalRestockItemsCount} <span className="text-xs text-slate-400 font-normal">/ {totalSkuCount}</span>
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">
                  {isAr ? `${Math.round((totalRestockItemsCount / totalSkuCount) * 100)}% من تشكيلة الصيدلية` : `${Math.round((totalRestockItemsCount / totalSkuCount) * 100)}% of catalog`}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                <Gauge className="w-6 h-6" />
              </div>
            </div>

            {/* Total Deficit Units to Restock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  {isAr ? 'إجمالي عجز العلب عن حد الأمان' : 'Total Deficit Units'}
                </span>
                <span className="text-2xl font-black font-mono text-teal-700 dark:text-teal-400 block">
                  -{totalDeficitBoxes} {isAr ? 'علبة' : 'boxes'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                  {isAr ? 'الكمية المطلوبة للوصول للأمان' : 'Units needed to reach safety'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center shrink-0">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            {/* Estimated Restock Budget */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  {isAr ? 'تقدير ميزانية أمر الشراء (PO)' : 'Est. Restock Purchase Cost'}
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                  {canViewCost ? `${totalEstimatedRestockBudget.toFixed(2)} SAR` : '••••••'}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
                  {canViewCost
                    ? (isAr ? 'محسوبة بسعر تكلفة الشراء' : 'Based on supplier cost price')
                    : (isAr ? 'صلاحية خاصة بصاحب الصيدلية والمدير' : 'Restricted to Manager')}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* المقترحات والتوصيات الصيدلانية التنفيذية (بدون نقط أو بوليتس)               */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isAr ? 'المقترحات والتوصيات الذكية لإدارة النواقص' : 'Strategic Restock & Clinical Recommendations'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAr ? 'إجراءات تشغيلية وسريرية فورية لمنع انقطاع الدواء وتحسين التدفق النقدي' : 'Actionable steps to eliminate stockouts and optimize inventory cash flow'}
                  </p>
                </div>
              </div>

              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {isAr ? '4 مقترحات تنفيذية' : '4 Actionable Strategies'}
              </span>
            </div>

            {/* 4 Professional Strategy Action Cards (NO DOTS, RICH CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Proposal 1: Emergency Restock for Zero Stock */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-rose-300 transition shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-md">
                      {isAr ? 'أولوية قصوى' : 'Highest Priority'}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAr ? 'التوريد الطارئ والفوري' : 'Emergency Restock'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'الأدوية المنقذة للحياة ذات الرصيد الصفر (مثل لانتوس أنسولين) تتطلب إرسال أمر توريد سريع لمستودع التوزيع فوراً لتفادي فقدان المرضى.'
                      : 'Zero-stock vital medicines like Lantus Insulin require an expedited purchase order dispatch.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowPoModal(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isAr ? 'توليد أمر التوريد الطارئ' : 'Generate Urgent PO'}</span>
                </button>
              </div>

              {/* Proposal 2: Generic Substitution Prompting */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-teal-200 dark:border-teal-900/60 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-teal-300 transition shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md">
                      {isAr ? 'إجراء سريري فوري' : 'Clinical Protocol'}
                    </span>
                    <RefreshCw className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAr ? 'تفعيل البدائل الصيدلانية' : 'Generic Substitution'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'النظام يوجه الكاشير تلقائياً لاقتراح البدائل المتوفرة فوراً في المخزن بنفس المادة الفعالة والشكل الصيدلاني لحين وصول الشحنات الجديدة.'
                      : 'Automate cashier prompts for identical therapeutic equivalents already in stock.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstLow = lowStockItems[0]?.medicine;
                    if (firstLow) {
                      handleOpenQuickRestock(firstLow, 20, firstLow.pricePerBox * 0.7);
                    }
                  }}
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? 'صرف شحنة بديلة سريعة' : 'Dispense Fast Batch'}</span>
                </button>
              </div>

              {/* Proposal 3: Dynamic Seasonal Reorder Levels */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-amber-300 transition shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-md">
                      {isAr ? 'تخطيط موسمي ذكي' : 'Seasonal Planning'}
                    </span>
                    <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAr ? 'حد الطلب الموسمي الديناميكي' : 'Seasonal Dynamic Reorder'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'يوصى برفع حد إعادة الطلب (ReorderLevel) لأدوية الجهاز التنفسي والربو (مثل فنتولين) بنسبة 30% خلال مواسم الغبار وتقلبات الطقس.'
                      : 'Scale up safety thresholds for respiratory and antihistamine products ahead of seasonal demand.'}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 text-center">
                  {isAr ? 'المستوى الموصى به: +30% أمان' : 'Recommended: +30% Safety'}
                </div>
              </div>

              {/* Proposal 4: Vendor Consolidation & Volume Rebates */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md">
                      {isAr ? 'توفير التكاليف' : 'Cost Saving'}
                    </span>
                    <Truck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAr ? 'تجميع طلبيات المورد الواحد' : 'Vendor Consolidation'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'دمج نواقص المستودع الواحد في طلبية واحدة لتجاوز الحد الأدنى للشحن المجاني والحصول على خصم نقدي إضافي بنسبة 3%.'
                      : 'Bundle supplier restock orders to qualify for free logistics and cash rebates.'}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-center">
                  {isAr ? `توفير متوقع: ${(totalEstimatedRestockBudget * 0.03).toFixed(1)} SAR` : 'Est. Savings: 3% Rebate'}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Severity Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={isAr ? 'بحث في قائمة النواقص بالاسم، المادة الفعالة، أو الباركود...' : 'Filter restock alerts by medicine name, barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                onClick={() => setDashboardSeverityFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  dashboardSeverityFilter === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'كافة النواقص' : 'All Alerts'} ({lowStockItems.length})
              </button>
              <button
                onClick={() => setDashboardSeverityFilter('zero')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  dashboardSeverityFilter === 'zero'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{isAr ? 'نافد تماماً (0)' : 'Out of Stock'} ({zeroStockCount})</span>
              </button>
              <button
                onClick={() => setDashboardSeverityFilter('critical')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  dashboardSeverityFilter === 'critical'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'عجز حرج (<40%)' : 'Critical Deficit'} ({criticalStockCount})
              </button>
              <button
                onClick={() => setDashboardSeverityFilter('warning')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  dashboardSeverityFilter === 'warning'
                    ? 'bg-yellow-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'بلغ حد الطلب' : 'Near Threshold'}
              </button>
            </div>
          </div>

          {/* DEDICATED RESTOCK ALERT LIST (Clean Table/Cards, No messy dots) */}
          <div className="space-y-3">
            {filteredDashboardItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isAr ? 'مستويات المخزون ممتازة!' : 'All Inventory Healthy!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isAr
                    ? 'لا توجد أدوية حالياً تقل عن حد إعادة الطلب المحدد (Reorder Level) وفق المعايير المحددة.'
                    : 'No medicines are currently falling below their designated ReorderLevel.'}
                </p>
              </div>
            ) : (
              filteredDashboardItems.map((item) => {
                const med = item.medicine;
                const isZero = item.severity === 'Zero';
                const isCritical = item.severity === 'Critical';

                return (
                  <div
                    key={med.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition hover:shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                      isZero
                        ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20'
                        : isCritical
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Item Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                            isZero
                              ? 'bg-rose-600 text-white'
                              : isCritical
                              ? 'bg-amber-600 text-white'
                              : 'bg-yellow-500 text-slate-950'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            {isZero
                              ? (isAr ? 'نفاد تام (مخزون 0)' : 'Out of Stock')
                              : isCritical
                              ? (isAr ? 'عجز حرج جداً' : 'Critical Deficit')
                              : (isAr ? 'تحذير حد الطلب' : 'Reorder Alert')}
                          </span>
                        </span>

                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {isAr ? med.tradeNameAr : med.tradeNameEn}
                        </h4>
                        <span className="text-xs text-slate-500">
                          ({isAr ? med.tradeNameEn : med.tradeNameAr})
                        </span>

                        {med.requiresPrescription && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-bold">
                            Rx
                          </span>
                        )}

                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {med.barcode}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">{isAr ? 'المادة الفعالة: ' : 'Active: '}</strong>
                        {isAr ? med.activeIngredientAr : med.activeIngredientEn}
                        <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-slate-800 dark:text-slate-200">{isAr ? 'الشكل: ' : 'Form: '}</span>
                        {med.dosageForm} ({med.unitsPerBox} {isAr ? 'أشرطة/علبة' : 'strips/box'})
                      </p>

                      {/* Stock Progress vs Reorder Level Gauge */}
                      <div className="space-y-1 pt-1 max-w-xl">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-700 dark:text-slate-300">
                            {isAr ? 'الرصيد الفعلي الحالي: ' : 'Current Stock: '}
                            <strong className={isZero ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                              {item.currentBoxes} {isAr ? 'علبة' : 'boxes'}
                            </strong>
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {isAr ? 'حد إعادة الطلب (ReorderLevel): ' : 'Reorder Level: '}
                            <strong className="text-teal-700 dark:text-teal-400 font-bold">{item.reorderLevel} {isAr ? 'علبة' : 'boxes'}</strong>
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isZero
                                ? 'w-0'
                                : isCritical
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(item.stockRatio, isZero ? 0 : 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Replenishment Recommendations & Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                      <div className="text-left lg:text-right space-y-0.5">
                        <div className="text-xs text-slate-500">
                          {isAr ? 'الكمية المقترحة لإعادة الطلب:' : 'Recommended Restock:'}
                        </div>
                        <div className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 flex items-center gap-1">
                          <span>+{item.suggestedRestockQty} {isAr ? 'علبة' : 'boxes'}</span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({isAr ? `تغطي عجز -${item.deficitBoxes}` : `fills -${item.deficitBoxes} deficit`})
                          </span>
                        </div>
                        {canViewCost && (
                          <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                            {isAr ? 'التكلفة التقديرية: ' : 'Est. Cost: '}
                            <strong>{item.estimatedRestockCost.toFixed(2)} SAR</strong>
                          </div>
                        )}
                      </div>

                      {/* Quick Restock Action Button */}
                      <button
                        onClick={() => handleOpenQuickRestock(med, item.suggestedRestockQty, item.latestCost)}
                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>{isAr ? 'توريد شحنة فورية' : 'Quick Restock Batch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GENERAL INVENTORY & FEFO CATALOG VIEW                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'إجمالي الأصناف المسجلة' : 'Total Registered SKUs'}</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">{totalSkuCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'إجمالي رصيد العلب بالمخزن' : 'Total Stock (Boxes)'}</span>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">{totalInventoryBoxes}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'شحنات حرجة الصلاحية (FEFO)' : 'Expiring Soon Batches'}</span>
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">{totalCriticalBatches}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'أدوية بلغت حد إعادة الطلب' : 'Low Stock Reorder Alerts'}</span>
                <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">{totalRestockItemsCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالاسم، المادة الفعالة، الباركود...' : 'Search by trade name, active ingredient, barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'جميع الأدوية' : 'All Medicines'}
              </button>
              <button
                onClick={() => setFilterType('expiringSoon')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'expiringSoon'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isAr ? 'قريبة الانتهاء (FEFO)' : 'Expiring Batches'}</span>
              </button>
              <button
                onClick={() => setFilterType('lowStock')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'lowStock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isAr ? 'نواقص وحد الطلب' : 'Low Stock'}</span>
              </button>
              <button
                onClick={() => setFilterType('rxOnly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterType === 'rxOnly'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'أدوية الوصفة (Rx)' : 'Rx Only'}
              </button>
            </div>
          </div>

          {/* Medicines & FEFO Batches List */}
          <div className="space-y-3">
            {filteredCatalogMedicines.map((med) => {
              const stock = calculateTotalStock(med);
              const isExpanded = expandedMedId === med.id;

              // Batches sorted by FEFO (earliest expiry first)
              const sortedBatches = [...med.batches].sort(
                (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
              );

              return (
                <div
                  key={med.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Medicine Summary Row */}
                  <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {isAr ? med.tradeNameAr : med.tradeNameEn}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({isAr ? med.tradeNameEn : med.tradeNameAr})
                        </span>
                        {med.requiresPrescription && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded font-bold">
                            Rx - {isAr ? 'تذكرة طبية' : 'Prescription'}
                          </span>
                        )}
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">
                          {med.barcode}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">{isAr ? 'المادة الفعالة: ' : 'Active: '}</strong>
                        {isAr ? med.activeIngredientAr : med.activeIngredientEn}
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-800 dark:text-slate-200">{isAr ? 'الشكل: ' : 'Form: '}</span>
                        {med.dosageForm} ({med.unitsPerBox} {isAr ? 'أشرطة/علبة' : 'strips/box'})
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-800 dark:text-slate-200">{isAr ? 'حد الطلب: ' : 'Reorder: '}</span>
                        <span className="font-mono text-teal-700 dark:text-teal-400 font-bold">{med.reorderLevel} {isAr ? 'علبة' : 'boxes'}</span>
                      </p>
                    </div>

                    {/* Stock Badges & Price */}
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{isAr ? 'سعر البيع:' : 'Price:'}</div>
                        <div className="font-mono font-bold text-teal-700 dark:text-teal-400 text-sm">
                          {med.pricePerBox.toFixed(2)} SAR <span className="text-xs text-slate-400 font-normal">({med.pricePerStrip.toFixed(2)}/شريط)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            stock.isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                              : stock.isLowStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {isAr
                            ? `المتوفر: ${stock.totalBoxes} علبة (${stock.totalStrips} شريط متبقي)`
                            : `${stock.totalBoxes} boxes in stock`}
                        </span>

                        <button
                          onClick={() => {
                            setTargetMedicine(med);
                            setShowAddBatchModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition cursor-pointer font-semibold"
                          title={isAr ? 'إضافة شحنة/تشغيلة جديدة' : 'Add new batch'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAr ? 'شحنة جديدة' : 'Add Batch'}</span>
                        </button>

                        <button
                          onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible FEFO Batches Detail Section */}
                  {isExpanded && (
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                          <Layers className="w-4 h-4 text-teal-600" />
                          <span>{isAr ? 'شحنات الصلاحية المسجلة بنظام FEFO (الأولوية للأقرب انتهاءً)' : 'Registered FEFO Batches (Priority by Expiry)'}</span>
                        </div>
                        <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                          {sortedBatches.length} {isAr ? 'تشغيلات' : 'batches'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">{isAr ? 'ترتيب الصرف (FEFO)' : 'FEFO Priority'}</th>
                              <th className="py-2.5 px-3">{isAr ? 'رقم التشغيلة' : 'Batch No'}</th>
                              <th className="py-2.5 px-3">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                              <th className="py-2.5 px-3">{isAr ? 'حالة الصلاحية' : 'Expiry Status'}</th>
                              <th className="py-2.5 px-3">{isAr ? 'الكمية المتاحة' : 'Available Qty'}</th>
                              <th className="py-2.5 px-3">{isAr ? 'موقع الرف' : 'Shelf Location'}</th>
                              {canViewCost && (
                                <th className="py-2.5 px-3">{isAr ? 'سعر الشراء' : 'Cost Price'}</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {sortedBatches.map((batch, bIndex) => {
                              const expiryInfo = getExpiryStatus(batch.expiryDate);
                              const isNextInLine = bIndex === 0;

                              return (
                                <tr
                                  key={batch.id}
                                  className={`hover:bg-white dark:hover:bg-slate-900/60 transition ${
                                    isNextInLine ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3">
                                    {isNextInLine ? (
                                      <span className="bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 w-fit">
                                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                        <span>{isAr ? 'أول شحنة للصرف (FEFO)' : '1st FEFO'}</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-mono">#{bIndex + 1}</span>
                                    )}
                                  </td>

                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {batch.batchNumber}
                                  </td>

                                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                    {batch.expiryDate}
                                  </td>

                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${expiryInfo.badgeColor}`}>
                                      {isAr ? expiryInfo.labelAr : expiryInfo.labelEn}
                                    </span>
                                  </td>

                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {batch.quantityBoxesAvailable} {isAr ? 'علبة' : 'boxes'}
                                    {batch.quantityStripsAvailable > 0 && (
                                      <span className="text-slate-500 font-normal text-[11px] ml-1">
                                        (+{batch.quantityStripsAvailable} {isAr ? 'أشرطة' : 'strips'})
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-2.5 px-3">
                                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1 w-fit">
                                      <MapPin className="w-3 h-3 text-teal-600" />
                                      <span>{batch.shelfLocation}</span>
                                    </span>
                                  </td>

                                  {canViewCost && (
                                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                                      {batch.costPrice.toFixed(2)} SAR
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RESTOCK PURCHASE ORDER (PO) GENERATOR MODAL                            */}
      {/* ========================================================================= */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <FileSpreadsheet className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <span>{isAr ? 'مسودة أمر شراء وتوريد نواقص الأدوية (Purchase Order)' : 'Restock Purchase Order (PO)'}</span>
              </div>
              <button
                onClick={() => setShowPoModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">{isAr ? 'أمر شراء صادر عن:' : 'Issued By:'}</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">صيدلية فارماكور المتقدمة (PharmaCore)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">{isAr ? 'التكلفة الإجمالية التقديرية:' : 'Estimated Total:'}</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-base">
                    {totalEstimatedRestockBudget.toFixed(2)} SAR
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{isAr ? 'اسم الصنف الدوائي' : 'Medicine Item'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الرصيد' : 'Stock'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'حد الطلب' : 'Reorder'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الكمية المقترحة' : 'Suggested Qty'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'سعر التكلفة' : 'Unit Cost'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الإجمالي' : 'Line Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {lowStockItems.map((item, idx) => (
                      <tr key={item.medicine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                          {isAr ? item.medicine.tradeNameAr : item.medicine.tradeNameEn}
                          <span className="text-[10px] text-slate-400 block font-mono font-normal">
                            {item.medicine.barcode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-rose-600 font-bold">{item.currentBoxes}</td>
                        <td className="py-2.5 px-3 text-teal-700 dark:text-teal-400 font-bold">{item.reorderLevel}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">+{item.suggestedRestockQty}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.latestCost.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{item.estimatedRestockCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <button
                onClick={handleCopyPoText}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedPo ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{isAr ? 'تم نسخ الطلبية للحافظة!' : 'Copied PO!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-teal-700" />
                    <span>{isAr ? 'نسخ مسودة أمر الشراء' : 'Copy PO to Clipboard'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowPoModal(false)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADD NEW BATCH MODAL                                                    */}
      {/* ========================================================================= */}
      {showAddBatchModal && targetMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <Plus className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>{isAr ? 'إضافة شحنة توريد جديدة (Restock Batch)' : 'Register New Batch'}</span>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'الدواء المستهدف للتوريد:' : 'Target Medicine:'}</label>
                <div className="font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>{isAr ? targetMedicine.tradeNameAr : targetMedicine.tradeNameEn}</span>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 font-mono font-bold">
                    {isAr ? `حد الطلب: ${targetMedicine.reorderLevel}` : `Reorder: ${targetMedicine.reorderLevel}`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'رقم التشغيلة (Batch):' : 'Batch Number:'}</label>
                  <input
                    type="text"
                    required
                    placeholder="BCH-2025-01"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'تاريخ الانتهاء (FEFO):' : 'Expiry Date:'}</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'الكمية الموردة (علب):' : 'Quantity (Boxes):'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityBoxes}
                    onChange={(e) => setQuantityBoxes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'سعر الشراء (التكلفة):' : 'Cost Price:'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">{isAr ? 'موقع الرف في الصيدلية:' : 'Shelf Location:'}</label>
                <input
                  type="text"
                  placeholder="A-01-Top, Fridge-2..."
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
                >
                  {isAr ? 'تسجيل التوريد وتحديث المخزون' : 'Save Restock Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
