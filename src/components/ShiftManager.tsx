import React, { useState } from 'react';
import { Shift, SalesInvoice, DailyCloseReport, PharmacySettings } from '../types/pharmacy';
import { 
  Wallet, 
  Clock, 
  UserCheck, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  Receipt, 
  CheckCircle2, 
  EyeOff, 
  Lock,
  Unlock,
  Building,
  Check,
  ArrowRightLeft,
  CalendarCheck,
  FileText,
  Printer,
  History,
  AlertTriangle,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { DailyZReportModal } from './DailyZReportModal';

interface ShiftManagerProps {
  currentShift: Shift | null;
  shifts: Shift[];
  invoices: SalesInvoice[];
  dailyReports: DailyCloseReport[];
  settings: PharmacySettings;
  onCloseShift: (countedCash: number, notes: string) => void;
  onOpenShift: (pharmacistName: string, openingCash: number, shiftNumber: number) => void;
  onChangeShift: (nextPharmacistName: string, countedCash: number, nextOpeningCash: number, notes: string) => void;
  onCloseDay: (reportData: Omit<DailyCloseReport, 'id' | 'reportNumber' | 'closedAt'>) => DailyCloseReport;
  lang: 'ar' | 'en';
  onViewInvoiceReceipt: (invoice: SalesInvoice) => void;
  canCloseDay?: boolean;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  currentShift,
  shifts,
  invoices,
  dailyReports,
  settings,
  onCloseShift,
  onOpenShift,
  onChangeShift,
  onCloseDay,
  lang,
  onViewInvoiceReceipt,
  canCloseDay = true,
}) => {
  const isAr = lang === 'ar';

  // Sub-tabs: 'active-shift' | 'close-day' | 'archive'
  const [activeSubTab, setActiveSubTab] = useState<'active-shift' | 'close-day' | 'archive'>('active-shift');

  // Modals state
  const [showBlindCountModal, setShowBlindCountModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [activeZReportPreview, setActiveZReportPreview] = useState<DailyCloseReport | null>(null);

  // Blind Count State
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [cashBreakdown, setCashBreakdown] = useState<{ [denom: number]: number }>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  // Handover State
  const [handoverNextPharmacist, setHandoverNextPharmacist] = useState('د. سارة العتيبي');
  const [handoverOpeningCash, setHandoverOpeningCash] = useState('500');
  const [handoverCountedCash, setHandoverCountedCash] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // New Shift State
  const [newShiftPharmacist, setNewShiftPharmacist] = useState('د. أحمد الشمري');
  const [newShiftOpeningCash, setNewShiftOpeningCash] = useState('500');

  // Total denominations computed
  const totalDenominations = Object.entries(cashBreakdown).reduce(
    (acc, [denom, count]) => acc + parseInt(denom) * (count || 0),
    0
  );

  const finalCountedAmount =
    totalDenominations > 0 ? totalDenominations : parseFloat(countedCashInput) || 0;

  const handleDenomChange = (denom: number, count: number) => {
    setCashBreakdown((prev) => ({
      ...prev,
      [denom]: Math.max(0, count || 0),
    }));
  };

  // Execute Blind Shift Close
  const handleExecuteBlindClose = () => {
    if (finalCountedAmount <= 0) {
      if (!confirm(isAr ? 'هل تؤكد تسجيل 0 نقدية في الخزينة؟' : 'Confirm zero cash in drawer?')) {
        return;
      }
    }
    onCloseShift(finalCountedAmount, closureNotes);
    setShowBlindCountModal(false);
    setCountedCashInput('');
    setClosureNotes('');
    setCashBreakdown({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
  };

  // Execute Handover
  const handleExecuteHandover = () => {
    const counted = parseFloat(handoverCountedCash) || (currentShift?.expectedCashTotal || 0);
    const openingForNext = parseFloat(handoverOpeningCash) || 500;
    const pharmacistName = handoverNextPharmacist.trim() || (isAr ? 'صيدلي مناوب' : 'Duty Pharmacist');

    onChangeShift(pharmacistName, counted, openingForNext, handoverNotes);
    setShowHandoverModal(false);
    setHandoverCountedCash('');
    setHandoverNotes('');
  };

  // Execute Open New Shift
  const handleExecuteOpenShift = () => {
    const openingCash = parseFloat(newShiftOpeningCash) || 500;
    const pharmacistName = newShiftPharmacist.trim() || (isAr ? 'صيدلي مناوب' : 'Duty Pharmacist');
    const nextShiftNum = (shifts.length > 0 ? Math.max(...shifts.map((s) => s.shiftNumber)) : 0) + 1;

    onOpenShift(pharmacistName, openingCash, nextShiftNum);
    setShowOpenShiftModal(false);
  };

  // Execute End of Day Close (Z-Report)
  const handleExecuteCloseDay = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Aggregations across all shifts
    const totalShiftsCount = shifts.length;
    const totalInvoicesCount = invoices.length;
    const totalGrossSales = invoices.reduce((acc, inv) => acc + inv.subTotal, 0);
    const totalDiscount = invoices.reduce((acc, inv) => acc + inv.discountAmount, 0);
    const totalNetSales = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

    const totalCashSales = shifts.reduce((acc, s) => acc + s.totalCashSales, 0);
    const totalCardSales = shifts.reduce((acc, s) => acc + s.totalCardSales, 0);
    const totalInsuranceSales = shifts.reduce((acc, s) => acc + s.totalInsuranceSales, 0);
    const totalExpenses = shifts.reduce((acc, s) => acc + s.cashWithdrawals, 0);
    const totalOpeningCash = shifts.reduce((acc, s) => acc + s.openingCash, 0);
    const totalExpectedCash = shifts.reduce((acc, s) => acc + s.expectedCashTotal, 0);
    const totalActualCashCounted = shifts.reduce(
      (acc, s) => acc + (s.actualCashCounted !== undefined ? s.actualCashCounted : s.expectedCashTotal),
      0
    );
    const totalNetVariance = shifts.reduce((acc, s) => acc + (s.variance || 0), 0);

    const generatedReport = onCloseDay({
      date: today,
      closedByPharmacist: currentShift?.pharmacistName || (isAr ? 'د. أحمد الشمري (المشرف)' : 'Lead Pharmacist'),
      totalShiftsCount,
      totalInvoicesCount,
      totalGrossSales,
      totalDiscount,
      totalNetSales,
      totalCashSales,
      totalCardSales,
      totalInsuranceSales,
      totalExpenses,
      totalOpeningCash,
      totalExpectedCash,
      totalActualCashCounted,
      totalNetVariance,
      status: 'Audited',
      notes: isAr ? 'تم تقفيل اليومية ومطابقة الحسابات آلياً بنجاح' : 'Daily close reconciled successfully',
    });

    setActiveZReportPreview(generatedReport);
  };

  const shiftInvoices = currentShift
    ? invoices.filter((i) => i.shiftId === currentShift.id)
    : [];

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Shift Sub-Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('active-shift')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'active-shift'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{isAr ? 'الشيفت الحالي وإدارته' : 'Active Shift & Handover'}</span>
            {currentShift?.status === 'Open' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('close-day')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'close-day'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{isAr ? 'تقفيل اليومية الشامل (Z-Report)' : 'Daily Close (Z-Report)'}</span>
            {!canCloseDay ? (
              <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                👑 {isAr ? 'للمدير فقط' : 'Manager Only'}
              </span>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                {shifts.length} {isAr ? 'شيفت' : 'shifts'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('archive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'archive'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{isAr ? 'أرشيف الشيفتات واليوميات' : 'Shift & Day Archive'}</span>
          </button>
        </div>

        {/* Quick Context Summary */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
          <span>{isAr ? 'إجمالي فواتير اليوم:' : 'Total Invoices Today:'} <strong className="text-slate-800 dark:text-slate-200 font-mono">{invoices.length}</strong></span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{isAr ? 'اليوميات المقفلة:' : 'Closed Days:'} <strong className="text-slate-800 dark:text-slate-200 font-mono">{dailyReports.length}</strong></span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: ACTIVE SHIFT & HANDOVER                       */}
      {/* ======================================================== */}
      {activeSubTab === 'active-shift' && (
        <div className="space-y-5">
          {currentShift ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {isAr ? `الشيفت الحالي #${currentShift.shiftNumber}` : `Active Shift #${currentShift.shiftNumber}`}
                      </h2>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                          currentShift.status === 'Open'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentShift.status === 'Open' ? (isAr ? 'مفتوح ونشط' : 'Open & Active') : (isAr ? 'مغلق ومحاسب' : 'Closed')}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{currentShift.pharmacistName}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        {isAr ? 'بدء الشيفت: ' : 'Opened: '}
                        {new Date(currentShift.openedAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}
                      </span>
                      {currentShift.closedAt && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>
                            {isAr ? 'تم الإغلاق: ' : 'Closed: '}
                            {new Date(currentShift.closedAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {currentShift.status === 'Open' ? (
                    <>
                      {/* Change / Handover Shift Button */}
                      <button
                        onClick={() => setShowHandoverModal(true)}
                        className="bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>{isAr ? 'تغيير وتسليم الشيفت' : 'Shift Handover'}</span>
                      </button>

                      {/* Close Shift Blind Count Button */}
                      <button
                        onClick={() => setShowBlindCountModal(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4" />
                        <span>{isAr ? 'تقفيل الشيفت (الجرد الأعمى)' : 'Close Shift (Blind Count)'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowOpenShiftModal(true)}
                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>{isAr ? 'فتح شيفت جديد' : 'Open New Shift'}</span>
                      </button>

                      <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isAr ? 'الشيفت مقفل ومطابق' : 'Shift Closed'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Balances Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'العهدة الافتتاحية:' : 'Opening Float:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base mt-1 block">
                    {currentShift.openingCash.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات الكاش النقدية:' : 'Cash Sales:'}</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base mt-1 block">
                    +{currentShift.totalCashSales.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات الشبكة (Visa):' : 'Card Sales:'}</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-base mt-1 block">
                    {currentShift.totalCardSales.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات التأمين الطبي:' : 'Insurance:'}</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400 text-base mt-1 block">
                    {currentShift.totalInsuranceSales.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مصروفات من الدرج:' : 'Cash Payouts:'}</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-base mt-1 block">
                    -{currentShift.cashWithdrawals.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/40 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <span className="text-[11px] text-teal-800 dark:text-teal-300 block font-bold">{isAr ? 'الرصيد الدفتري المتوقع:' : 'Expected Cash:'}</span>
                  <span className="font-mono font-black text-teal-900 dark:text-white text-base mt-1 block">
                    {currentShift.expectedCashTotal.toFixed(2)} SAR
                  </span>
                </div>
              </div>

              {/* If shift is closed, show reconciliation variance */}
              {currentShift.status === 'Closed' && currentShift.actualCashCounted !== undefined && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">{isAr ? 'النقدية الفعلية المحصورة (الجرد الأعمى):' : 'Actual Cash Counted:'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-lg">
                      {currentShift.actualCashCounted.toFixed(2)} SAR
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">{isAr ? 'نتيجة المطابقة (الفارق):' : 'Reconciliation Variance:'}</span>
                    <span
                      className={`font-mono font-black text-lg ${
                        (currentShift.variance || 0) === 0
                          ? 'text-emerald-600'
                          : (currentShift.variance || 0) > 0
                          ? 'text-teal-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {(currentShift.variance || 0) > 0 ? '+' : ''}
                      {(currentShift.variance || 0).toFixed(2)} SAR
                      <span className="text-xs font-normal ml-2">
                        {(currentShift.variance || 0) === 0
                          ? (isAr ? '(متطابق تماماً)' : '(Balanced)')
                          : (currentShift.variance || 0) > 0
                          ? (isAr ? '(زيادة نقدية)' : '(Surplus)')
                          : (isAr ? '(عجز نقدي)' : '(Deficit)')}
                      </span>
                    </span>
                  </div>

                  {currentShift.closureNotes && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 italic">
                      "{currentShift.closureNotes}"
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'لا يوجد شيفت مفتوح حالياً' : 'No Open Shift Currently Active'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isAr
                  ? 'لبدء العمليات الصيدلانية وإصدار فواتير البيع في نقطة البيع POS، يجب فتح شيفت جديد وتحديد العهدة الافتتاحية.'
                  : 'To enable POS checkout and billing operations, please open a new shift and register the opening cash float.'}
              </p>
              <button
                onClick={() => setShowOpenShiftModal(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAr ? 'فتح شيفت جديد الآن' : 'Open New Shift Now'}</span>
              </button>
            </div>
          )}

          {/* Shift Invoices Table */}
          {currentShift && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 dark:bg-slate-950/70 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAr ? 'سجل فواتير الشيفت المكتملة' : 'Shift Completed Invoices'}
                  </h3>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {shiftInvoices.length} {isAr ? 'فاتورة' : 'invoices'}
                  </span>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {shiftInvoices.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    {isAr ? 'لم يتم إصدار فواتير خلال هذا الشيفت بعد' : 'No invoices issued in this shift yet'}
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">{isAr ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الوقت' : 'Time'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'طريقة الدفع' : 'Payment'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الأصناف' : 'Items'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الصافي' : 'Grand Total'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الإجراء' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {shiftInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(inv.dateTime).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            {inv.items.length} {isAr ? 'أصناف' : 'items'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                            {inv.grandTotal.toFixed(2)} SAR
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onViewInvoiceReceipt(inv)}
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{isAr ? 'عرض الإيصال (80mm)' : 'View Receipt'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DAILY CLOSE & COMPREHENSIVE Z-REPORT          */}
      {/* ======================================================== */}
      {activeSubTab === 'close-day' && (
        <div className="space-y-5">
          {/* Main Action Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {isAr ? 'تقفيل اليومية المحاسبية الشاملة (Daily Z-Report)' : 'Comprehensive Daily Close (Z-Report)'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isAr
                      ? 'تجميع واعتماد مبيعات كافة الشيفتات المنعقدة اليوم، وتدقيق أرصدة الخزينة والشبكة وتوليد تقرير الإقفال الرسمي'
                      : 'Consolidates all cashier shifts, performs cash drawer reconciliation and issues official Z-Report'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!canCloseDay ? (
                  <div className="bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>{isAr ? '🔒 مقتصر على مدير الصيدلية (غير مصرح للموظف)' : 'Manager Role Required'}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleExecuteCloseDay}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isAr ? 'إقفال اليومية وتوليد تقرير Z-Report' : 'Finalize & Generate Z-Report'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Warning if current shift is open */}
            {currentShift?.status === 'Open' && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isAr
                    ? `تنبيه محاسبي: الشيفت #${currentShift.shiftNumber} ما زال مفتوحاً. تقفيل اليومية سيشمل أرقامه الحالية، ويُفضل تقفيله بالجرد الأعمى أولاً.`
                    : `Notice: Shift #${currentShift.shiftNumber} is currently open. Generating Z-Report will aggregate live totals.`}
                </span>
              </div>
            )}

            {/* Daily High-Level KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'صافي مبيعات اليوم الكلية:' : 'Total Net Sales:'}</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-lg mt-1 block">
                  {invoices.reduce((acc, i) => acc + i.grandTotal, 0).toFixed(2)} SAR
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {invoices.length} {isAr ? 'فاتورة مكتملة' : 'invoices'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات الكاش النقدية:' : 'Cash Payments:'}</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-lg mt-1 block">
                  {shifts.reduce((acc, s) => acc + s.totalCashSales, 0).toFixed(2)} SAR
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {shifts.filter((s) => s.totalCashSales > 0).length} {isAr ? 'شيفتات بمبيعات كاش' : 'shifts'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات الشبكة (مدى/فيزا):' : 'Card Payments:'}</span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-lg mt-1 block">
                  {shifts.reduce((acc, s) => acc + s.totalCardSales, 0).toFixed(2)} SAR
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isAr ? 'مطابقة آلية للبنك' : 'POS Terminal Audit'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{isAr ? 'مبيعات التأمين الطبي:' : 'Insurance Claims:'}</span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-400 text-lg mt-1 block">
                  {shifts.reduce((acc, s) => acc + s.totalInsuranceSales, 0).toFixed(2)} SAR
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isAr ? 'مطالبات معتمدة' : 'Approved claims'}
                </span>
              </div>
            </div>
          </div>

          {/* Shifts Breakdown for Today */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 dark:bg-slate-950/70 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isAr ? 'جدول تدقيق كافة شيفتات اليوم' : 'Daily Shifts Audit Table'}
                </h3>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'الشيفت' : 'Shift #'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الصيدلي' : 'Pharmacist'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'العهدة' : 'Float'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'كاش' : 'Cash'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'شبكة' : 'Card'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المتوقع' : 'Expected'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الفعلي' : 'Counted'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الفارق' : 'Variance'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        #{s.shiftNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {s.pharmacistName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {s.openingCash.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        +{s.totalCashSales.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-teal-700 dark:text-teal-400 font-bold">
                        {s.totalCardSales.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {s.expectedCashTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {s.actualCashCounted !== undefined ? s.actualCashCounted.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {s.variance !== undefined ? (
                          <span
                            className={
                              s.variance === 0
                                ? 'text-emerald-600'
                                : s.variance > 0
                                ? 'text-teal-600'
                                : 'text-rose-600'
                            }
                          >
                            {s.variance > 0 ? '+' : ''}
                            {s.variance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'Open'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {s.status === 'Open' ? (isAr ? 'مفتوح' : 'Open') : (isAr ? 'مغلق' : 'Closed')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ARCHIVE OF PAST SHIFTS & DAILY REPORTS        */}
      {/* ======================================================== */}
      {activeSubTab === 'archive' && (
        <div className="space-y-5">
          {/* Daily Z-Reports Finalized Archive */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 dark:bg-slate-950/70 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isAr ? 'أرشيف اليوميات المقفلة رسميًا (Finalized Z-Reports)' : 'Finalized Z-Reports Archive'}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {dailyReports.length} {isAr ? 'تقرير معتمد' : 'audited reports'}
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              {dailyReports.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  {isAr ? 'لم يتم تقفيل يوميات بعد. يمكنك تقفيل اليومية الحالية من تبويب (تقفيل اليومية الشامل).' : 'No daily Z-reports archived yet.'}
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">{isAr ? 'رقم التقرير' : 'Report No'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المسؤول' : 'Audited By'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الشيفتات' : 'Shifts'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الفواتير' : 'Invoices'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'صافي المبيعات' : 'Net Sales'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'فارق الخزينة' : 'Variance'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                          {report.reportNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {report.date}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {report.closedByPharmacist}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {report.totalShiftsCount}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {report.totalInvoicesCount}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {report.totalNetSales.toFixed(2)} SAR
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span
                            className={
                              report.totalNetVariance === 0
                                ? 'text-emerald-600'
                                : report.totalNetVariance > 0
                                ? 'text-teal-600'
                                : 'text-rose-600'
                            }
                          >
                            {report.totalNetVariance > 0 ? '+' : ''}
                            {report.totalNetVariance.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setActiveZReportPreview(report)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{isAr ? 'عرض وطباعة Z-Report' : 'Print Z-Report'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: BLIND CASH COUNT MODAL                          */}
      {/* ======================================================== */}
      {showBlindCountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <EyeOff className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <span>{isAr ? 'الجرد الأعمى للخزينة (Blind Cash Count)' : 'Blind Cash Drawer Audit'}</span>
              </div>
              <button
                onClick={() => setShowBlindCountModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>{isAr ? 'سياسة الحوكمة والرقابة المالية:' : 'Internal Audit Policy:'}</span>
                </span>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isAr
                    ? 'في نظام الجرد الأعمى، لا يظهر الرصيد المتوقع للصيدلي حتى يقوم بعدّ النقدية الفعلية داخل الدرج وتسجيلها تفصيلياً.'
                    : 'System expected cash remains masked until actual drawer cash is counted.'}
                </p>
              </div>

              {/* Denomination Counter Grid */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'تفكيك الفئات النقدية (ريال سعودي):' : 'Cash Denomination Breakdown:'}</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  {[500, 200, 100, 50, 20, 10, 5, 1].map((denom) => (
                    <div key={denom} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 w-16">{denom} SAR:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={cashBreakdown[denom] || ''}
                        onChange={(e) => handleDenomChange(denom, parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-center font-mono text-slate-900 dark:text-white text-xs"
                      />
                      <span className="text-[11px] text-slate-500 font-mono w-14 text-right">
                        = {((cashBreakdown[denom] || 0) * denom).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lump Sum Direct Input Option */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 block font-bold">
                  {isAr ? 'أو أدخل إجمالي النقدية المحصورة مباشرة:' : 'Or enter total lump sum counted:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalDenominations > 0 ? totalDenominations.toFixed(2) : countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white text-sm"
                />
              </div>

              {/* Closure Notes */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 block font-bold">{isAr ? 'ملاحظات تسليم الشيفت (اختياري):' : 'Handover Notes (Optional):'}</label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'أي ملاحظات عن فوارق نقدية أو فواتير معلقة...' : 'Notes on drawer count or pending vouchers...'}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="font-mono text-xs">
                <span className="text-slate-500">{isAr ? 'إجمالي العد:' : 'Total Counted:'} </span>
                <span className="font-black text-teal-800 dark:text-teal-400 text-sm">
                  {finalCountedAmount.toFixed(2)} SAR
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBlindCountModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleExecuteBlindClose}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {isAr ? 'تأكيد وإغلاق الشيفت' : 'Confirm & Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SHIFT HANDOVER MODAL (تسليم الشيفت للصيدلي التالي) */}
      {/* ======================================================== */}
      {showHandoverModal && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <ArrowRightLeft className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <span>{isAr ? 'تسليم الشيفت لصيدلي آخر (Shift Handover)' : 'Shift Handover'}</span>
              </div>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-900 dark:text-teal-200">
                <span className="font-bold block mb-1">
                  {isAr ? 'معلومات التسليم الآلي:' : 'Handover Information:'}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {isAr
                    ? `سيتم إقفال الشيفت الحالي #${currentShift.shiftNumber} رسمياً وتوثيق الفارق النقدي، وفتح الشيفت #${currentShift.shiftNumber + 1} فوراً باسم الصيدلي المستلم مع ترحيل العهدة المحددة.`
                    : `Current shift #${currentShift.shiftNumber} will be closed and shift #${currentShift.shiftNumber + 1} opened immediately.`}
                </p>
              </div>

              {/* Current Pharmacist */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'الصيدلي المسلّم (الحالي):' : 'Current Pharmacist:'}
                </label>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                  {currentShift.pharmacistName}
                </div>
              </div>

              {/* Next Pharmacist Name */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'الصيدلي المستلم (الشيفت القادم):' : 'Receiving Pharmacist:'}
                </label>
                <div className="flex gap-2 mb-2">
                  {['د. سارة العتيبي', 'د. فهد الغامدي', 'د. خالد السعيد'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setHandoverNextPharmacist(name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        handoverNextPharmacist === name
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={handoverNextPharmacist}
                  onChange={(e) => setHandoverNextPharmacist(e.target.value)}
                  placeholder={isAr ? 'أدخل اسم الصيدلي المستلم...' : 'Enter next pharmacist name...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Cash count & Opening Float for next shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'النقدية المحصورة بالدرج:' : 'Counted Cash:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={currentShift.expectedCashTotal.toFixed(2)}
                    value={handoverCountedCash}
                    onChange={(e) => setHandoverCountedCash(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                    {isAr ? 'المتوقع: ' : 'Expected: '} {currentShift.expectedCashTotal.toFixed(2)} SAR
                  </span>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'عهدة الشيفت الجديد:' : 'Opening Float for Next:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={handoverOpeningCash}
                    onChange={(e) => setHandoverOpeningCash(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {isAr ? 'تترك بالدرج كعهدة' : 'Remains in drawer'}
                  </span>
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'ملاحظات محضر التسليم:' : 'Handover Log Notes:'}
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder={isAr ? 'أي توصيات أو نواقص أو إشعارات للصيدلي القادم...' : 'Any clinical or drawer notes for the next shift...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowHandoverModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteHandover}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{isAr ? 'إتمام التسليم وفتح الشيفت الجديد' : 'Complete Handover'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: OPEN NEW SHIFT MODAL (فتح شيفت جديد)             */}
      {/* ======================================================== */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <PlusCircle className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <span>{isAr ? 'فتح شيفت جديد' : 'Open New Shift'}</span>
              </div>
              <button
                onClick={() => setShowOpenShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'اسم الصيدلي المسؤول:' : 'Pharmacist in Charge:'}
                </label>
                <div className="flex gap-2 mb-2">
                  {['د. أحمد الشمري', 'د. سارة العتيبي', 'د. فهد الغامدي'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewShiftPharmacist(name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        newShiftPharmacist === name
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newShiftPharmacist}
                  onChange={(e) => setNewShiftPharmacist(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'العهدة النقدية الافتتاحية (ريال سعودي):' : 'Opening Cash Float (SAR):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newShiftOpeningCash}
                  onChange={(e) => setNewShiftOpeningCash(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isAr ? 'المبلغ المستلم كفكة نقدية في درج الكاشير عند بدء الدوام' : 'Cash change placed in the drawer at shift start'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowOpenShiftModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteOpenShift}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'تأكيد وفتح الشيفت' : 'Confirm & Open'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Z-REPORT MODAL PREVIEW & THERMAL PRINT          */}
      {/* ======================================================== */}
      {activeZReportPreview && (
        <DailyZReportModal
          report={activeZReportPreview}
          shifts={shifts}
          settings={settings}
          isOpen={!!activeZReportPreview}
          onClose={() => setActiveZReportPreview(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
