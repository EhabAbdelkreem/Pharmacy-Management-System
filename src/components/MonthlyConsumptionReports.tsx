import React, { useState, useMemo } from 'react';
import { Medicine, SalesInvoice, PharmacySettings } from '../types/pharmacy';
import { 
  calculateDrugConsumptionAnalytics, 
  MonthlyTrendData, 
  MedicineConsumptionStat, 
  CategoryConsumptionStat 
} from '../services/consumptionAnalytics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  Printer,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Zap,
  Download,
  Building2,
  X,
  FileText,
  DollarSign
} from 'lucide-react';

interface MonthlyConsumptionReportsProps {
  medicines: Medicine[];
  invoices: SalesInvoice[];
  settings: PharmacySettings;
  lang: 'ar' | 'en';
  canViewFinancials?: boolean;
}

export const MonthlyConsumptionReports: React.FC<MonthlyConsumptionReportsProps> = ({
  medicines,
  invoices,
  settings,
  lang,
  canViewFinancials = true,
}) => {
  const isAr = lang === 'ar';

  // State controls
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [metricMode, setMetricMode] = useState<'boxes' | 'revenue'>('boxes');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'overview' | 'forecasting' | 'table'>('overview');

  // Compute analytics data
  const analytics = useMemo(() => {
    return calculateDrugConsumptionAnalytics(medicines, invoices, selectedMonth);
  }, [medicines, invoices, selectedMonth]);

  // Categories list for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => set.add(m.categoryAr));
    return Array.from(set);
  }, [medicines]);

  // Filtered medicine stats for the detailed table
  const filteredMedicineStats = useMemo(() => {
    return analytics.medicineStats.filter((m) => {
      const matchesSearch =
        m.tradeNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tradeNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.activeIngredientAr.includes(searchQuery);
      
      const matchesCategory =
        categoryFilter === 'all' || m.categoryAr === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [analytics.medicineStats, searchQuery, categoryFilter]);

  // Formatted Top-Selling data for Recharts Bar Chart
  const topSellingChartData = useMemo(() => {
    return analytics.topSellingMedicines.map((m) => ({
      name: isAr ? m.tradeNameAr : m.tradeNameEn,
      boxes: m.monthlyDispensedBoxes,
      revenue: m.monthlyRevenueSAR,
      forecast: m.forecastedDemandNextMonth,
      category: m.categoryAr,
    }));
  }, [analytics.topSellingMedicines, isAr]);

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'اسم الدواء',
      'التصنيف',
      'المخزون الحالي (علب)',
      'الاستهلاك الشهري (علب)',
      'قيمة المبيعات (SAR)',
      'معدل السحب اليومي',
      'الأيام المتبقية قبل النفاد',
      'الطلب المتوقع للشهر القادم',
      'الكمية المقترح توريدها',
      'حالة المخاطر',
    ];

    const rows = filteredMedicineStats.map((m) => [
      `"${m.tradeNameAr} (${m.tradeNameEn})"`,
      `"${m.categoryAr}"`,
      m.currentStockBoxes,
      m.monthlyDispensedBoxes,
      m.monthlyRevenueSAR.toFixed(2),
      m.averageDailyBurnRate,
      m.daysOfSupplyRemaining,
      m.forecastedDemandNextMonth,
      m.suggestedReorderBoxes,
      `"${m.riskLevel}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_استهلاك_الأدوية_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-extrabold text-teal-300">{data.name}</div>
          <div className="text-[11px] text-slate-300">{data.category}</div>
          <div className="border-t border-slate-700/80 pt-1 space-y-0.5">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">الكمية المصروفة:</span>
              <span className="font-bold text-white font-mono">{data.boxes} علبة</span>
            </div>
            {canViewFinancials && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">قيمة الاستهلاك:</span>
                <span className="font-bold text-emerald-400 font-mono">{data.revenue} SAR</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">الطلب المتوقع القادم:</span>
              <span className="font-bold text-amber-400 font-mono">+{data.forecast} علبة</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-extrabold text-teal-300">{data.monthLabelAr}</div>
          <div className="border-t border-slate-700/80 pt-1 space-y-1">
            {data.actualBoxes !== null ? (
              <div className="flex justify-between gap-4">
                <span className="text-emerald-400 font-semibold">الاستهلاك الفعلي:</span>
                <span className="font-bold text-white font-mono">{data.actualBoxes} علبة</span>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <span className="text-amber-400 font-semibold">الطلب المتوقع (تنبؤ):</span>
                <span className="font-bold text-amber-300 font-mono">~{data.forecastBoxes} علبة</span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-[10px] text-slate-400">
              <span>حد الأمان الموصى به:</span>
              <span className="font-mono">{data.upperBandBoxes} علبة</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Page Header & Period Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'تقارير استهلاك الأدوية والتنبؤ بالطلب' : 'Drug Consumption & Demand Forecasting'}
              </h1>
              <span className="text-[11px] bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                Recharts AI Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'تحليل معدلات الصرف الشهرية، أكثر الأدوية مبيعاً، وتوقع الاحتياج التقديري لتفادي نفاد الأدوية' : 'Monthly consumption trends, best-selling SKUs, and predictive inventory replenishment'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="2026-11">نوفمبر 2026 (الشهر الحالي)</option>
              <option value="2026-10">أكتوبر 2026</option>
              <option value="2026-09">سبتمبر 2026</option>
              <option value="2026-08">أغسطس 2026</option>
            </select>
          </div>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="تصدير جدول الاستهلاك والتنبؤ كملف Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          {/* Print Monthly Statement */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? 'طباعة تقرير استهلاك شهري' : 'Print Monthly Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Dispensed Units */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">
              {isAr ? 'إجمالي العلب المصروفة شهرياً' : 'Total Monthly Units Dispensed'}
            </span>
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white block">
              {analytics.totalMonthlyBoxes} <span className="text-xs text-slate-400 font-normal">علبة</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.2% نمو في السحب مقارنة بالشهر السابق</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">
              {isAr ? 'قيمة الأدوية المستهلكة' : 'Total Consumed Value'}
            </span>
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
              {canViewFinancials ? `${analytics.totalMonthlyRevenue.toFixed(0)} SAR` : '••••••'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              {canViewFinancials ? 'بسعر البيع المعتمد بالصيدلية' : 'صلاحية خاصة بالمدير'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Forecasted Demand Next Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">
              {isAr ? 'الطلب المتوقع للشهر القادم' : 'Forecasted Next Month Demand'}
            </span>
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 block">
              +{analytics.totalForecastedBoxesNextMonth} <span className="text-xs text-slate-400 font-normal">علبة</span>
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">
              مبني على خوارزميات التنبؤ الموسمي
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Top-Selling Item */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">
              {isAr ? 'الدواء الأكثر مبيعاً هذا الشهر' : 'Top Dispensed Medicine'}
            </span>
            <span className="text-base font-black text-teal-800 dark:text-teal-300 truncate max-w-[170px] block" title={analytics.topMedicine?.tradeNameAr}>
              {analytics.topMedicine?.tradeNameAr || 'أوجمنتين 1 غرام'}
            </span>
            <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold block">
              {analytics.topMedicine?.monthlyDispensedBoxes || 0} علبة تم صرفها
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Charts Grid using Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Top Best-Selling Medicines (BarChart - 7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'أكثر الأدوية مبيعاً واستهلاكاً' : 'Top Best-Selling Medicines'}</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded">
                  Top 8 SKUs
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'مقارنة حجم السحب الفعلي بالعلب مع التوقع القادم' : 'Dispensed units comparison vs demand forecast'}
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setMetricMode('boxes')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  metricMode === 'boxes'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'عدد العلب' : 'Units'}
              </button>
              {canViewFinancials && (
                <button
                  onClick={() => setMetricMode('revenue')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    metricMode === 'revenue'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isAr ? 'القيمة (SAR)' : 'Revenue (SAR)'}
                </button>
              )}
            </div>
          </div>

          {/* Recharts BarChart */}
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSellingChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => value === 'boxes' ? 'الكمية المستهلكة (علب)' : value === 'forecast' ? 'الطلب المتوقع القادم' : 'القيمة المالية (SAR)'}
                />
                {metricMode === 'boxes' ? (
                  <>
                    <Bar dataKey="boxes" fill="#0d9488" radius={[6, 6, 0, 0]} name="boxes" />
                    <Bar dataKey="forecast" fill="#f59e0b" radius={[6, 6, 0, 0]} name="forecast" />
                  </>
                ) : (
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="revenue" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Consumption Breakdown (PieChart - 5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isAr ? 'توزيع الاستهلاك حسب المجموعة العلاجية' : 'Consumption by Therapeutic Class'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'نسبة كل فئة دوائية من إجمالي مبيعات الصيدلية' : 'Share of total dispensed medicines'}
            </p>
          </div>

          {/* Recharts PieChart */}
          <div className="h-64 w-full flex items-center justify-center" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="quantityBoxes"
                  nameKey="categoryAr"
                >
                  {analytics.categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value} علبة (${item.payload.percentage}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Legend List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {analytics.categoryStats.slice(0, 5).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px]">{cat.categoryAr}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-slate-500">{cat.quantityBoxes} علبة</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart 3: Historical Consumption Trend & Future Demand Forecast (AreaChart full width) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'منحنى الاستهلاك الشهري والتنبؤ المستقبلي بالطلب' : 'Monthly Trend & Future Demand Forecasting Curve'}</span>
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                6 أشهر سابقة + 3 أشهر مستقبلية
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'الخط الأخضر يمثل الاستهلاك الفعلي، والخط البرتقالي المنقط يمثل الطلب المتوقع المستقبلي مع نطاق الأمان' : 'Actual historical trend seamlessly transitioning into projected future requirement'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
              <span>استهلاك فعلي</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-1.5 rounded-full bg-amber-500"></span>
              <span>تنبؤ بالطلب (Forecast)</span>
            </span>
          </div>
        </div>

        {/* Recharts AreaChart & LineChart */}
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.monthlyTrend} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
              <XAxis dataKey="monthLabelAr" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTrendTooltip />} />
              <Area
                type="monotone"
                dataKey="actualBoxes"
                stroke="#0d9488"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#actualGradient)"
                name="الاستهلاك الفعلي"
              />
              <Area
                type="monotone"
                dataKey="forecastBoxes"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#forecastGradient)"
                name="الطلب المتوقع"
              />
              <Line
                type="monotone"
                dataKey="upperBandBoxes"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="حد الأمان الأعلى"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Demand Forecasting Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isAr ? 'جدول الذكاء التنبؤي لاستهلاك الأدوية وإعادة التوريد' : 'Predictive Inventory Depletion & Replenishment Matrix'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr ? 'معدل الاستهلاك اليومي والأيام المتبقية قبل النفاد والكميات المقترح طلبها فوراً' : 'Item-level burn rate, remaining days of inventory, and suggested purchase orders'}
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500">
            {filteredMedicineStats.length} {isAr ? 'أصناف مطابقة' : 'matching medicines'}
          </span>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم التجاري أو المادة الفعالة...' : 'Search medicine name, active ingredient...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            {categoriesList.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Predictive Matrix Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5">{isAr ? 'الدواء والمادة الفعالة' : 'Medicine & Active'}</th>
                <th className="py-3 px-3">{isAr ? 'المخزون الحالي' : 'Current Stock'}</th>
                <th className="py-3 px-3">{isAr ? 'الاستهلاك الشهري' : 'Monthly Dispensed'}</th>
                <th className="py-3 px-3">{isAr ? 'معدل السحب اليومي' : 'Daily Burn Rate'}</th>
                <th className="py-3 px-3">{isAr ? 'الأيام المتبقية قبل النفاد' : 'Days of Supply'}</th>
                <th className="py-3 px-3">{isAr ? 'الطلب المتوقع القادم' : 'Forecasted Next Month'}</th>
                <th className="py-3 px-3">{isAr ? 'المقترح توريده (PO)' : 'Suggested PO'}</th>
                <th className="py-3 px-3">{isAr ? 'حالة التوريد' : 'Supply Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMedicineStats.map((item) => {
                const isCritical = item.riskLevel === 'Critical';
                const isWarning = item.riskLevel === 'Warning';

                return (
                  <tr 
                    key={item.medicineId}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                      isCritical ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    {/* Name & Active */}
                    <td className="py-3 px-3.5 space-y-0.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {isAr ? item.tradeNameAr : item.tradeNameEn}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {item.activeIngredientAr}
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={item.currentStockBoxes === 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}>
                        {item.currentStockBoxes} علبة
                      </span>
                    </td>

                    {/* Monthly Dispensed */}
                    <td className="py-3 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                      {item.monthlyDispensedBoxes} علبة
                    </td>

                    {/* Daily Burn Rate */}
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {item.averageDailyBurnRate} علبة/يوم
                    </td>

                    {/* Days Remaining with Visual Bar */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                          <span className={isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                            {item.daysOfSupplyRemaining > 120 ? '> 120 يوم' : `${item.daysOfSupplyRemaining} يوم`}
                          </span>
                        </div>
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isCritical ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (item.daysOfSupplyRemaining / 45) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Forecasted Next Month */}
                    <td className="py-3 px-3 font-mono font-extrabold text-amber-600 dark:text-amber-400">
                      +{item.forecastedDemandNextMonth} علبة
                    </td>

                    {/* Suggested Replenishment PO */}
                    <td className="py-3 px-3 font-mono">
                      {item.suggestedReorderBoxes > 0 ? (
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded">
                          +{item.suggestedReorderBoxes} علبة
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">مكتفٍ</span>
                      )}
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : item.riskLevel === 'Overstock'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {item.riskLevel === 'Critical'
                          ? (isAr ? 'عجز وشيك' : 'Critical')
                          : item.riskLevel === 'Warning'
                          ? (isAr ? 'إعادة طلب' : 'Reorder')
                          : item.riskLevel === 'Overstock'
                          ? (isAr ? 'فائض' : 'Overstock')
                          : (isAr ? 'مستقر' : 'Optimal')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable Monthly Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Controls (Not for print) */}
            <div className="bg-slate-100 px-6 py-3 border-b flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <FileText className="w-4 h-4 text-teal-700" />
                <span>معاينة تقرير الاستهلاك الشهري الرسمي للطباعة A4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:m-0 font-sans text-xs" dir="rtl">
              
              {/* Document Header */}
              <div className="border-b-2 border-teal-800 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-teal-900">{settings.pharmacyNameAr}</h1>
                  <p className="text-xs text-slate-600 mt-0.5">{settings.addressAr} • هاتف: {settings.phone}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">الرقم الضريبي: {settings.taxNumber}</p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-sm font-black text-slate-800">تقرير استهلاك الأدوية الشهري</div>
                  <div className="text-xs text-slate-500">الفترة: {selectedMonth}</div>
                  <div className="text-[10px] text-slate-400">تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}</div>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">إجمالي العلب المصروفة:</span>
                  <span className="text-lg font-black font-mono text-teal-900">{analytics.totalMonthlyBoxes} علبة</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">القيمة الإجمالية للمبيعات:</span>
                  <span className="text-lg font-black font-mono text-emerald-800">{analytics.totalMonthlyRevenue.toFixed(2)} SAR</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">الطلب المتوقع الشهر القادم:</span>
                  <span className="text-lg font-black font-mono text-amber-800">+{analytics.totalForecastedBoxesNextMonth} علبة</span>
                </div>
              </div>

              {/* Table of Top Consumed Medicines */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-800">بيان تفصيلي للأدوية الأكثر استهلاكاً والطلب المتوقع</h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300 text-right">اسم الدواء والمادة الفعالة</th>
                      <th className="p-2 border border-slate-300 text-center">التصنيف</th>
                      <th className="p-2 border border-slate-300 text-center">الرصيد الحالي</th>
                      <th className="p-2 border border-slate-300 text-center">الكمية المصروفة</th>
                      <th className="p-2 border border-slate-300 text-center">قيمة المبيعات</th>
                      <th className="p-2 border border-slate-300 text-center">الطلب المتوقع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.medicineStats.slice(0, 15).map((med, idx) => (
                      <tr key={med.medicineId} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">{med.tradeNameAr} <span className="text-[10px] text-slate-500 font-normal">({med.activeIngredientAr})</span></td>
                        <td className="p-2 border border-slate-300 text-center">{med.categoryAr}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono">{med.currentStockBoxes}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-teal-800">{med.monthlyDispensedBoxes}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono">{med.monthlyRevenueSAR.toFixed(2)}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-amber-700">+{med.forecastedDemandNextMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Approvals */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-10">
                  <span className="font-bold block">إعداد الصيدلي المسؤول:</span>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-mono text-slate-600">التوقيع والتاريخ</div>
                </div>
                <div className="space-y-10">
                  <span className="font-bold block">اعتماد مدير الصيدلية وخاتم المنشأة:</span>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-mono text-slate-600">الخاتم والاعتماد الرسمي</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
