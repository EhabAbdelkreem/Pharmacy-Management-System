import React from 'react';
import { DailyCloseReport, PharmacySettings, Shift } from '../types/pharmacy';
import { Printer, X, CheckCircle, FileText, Building2, Calendar, UserCheck } from 'lucide-react';

interface DailyZReportModalProps {
  report: DailyCloseReport | null;
  shifts: Shift[];
  settings: PharmacySettings;
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const DailyZReportModal: React.FC<DailyZReportModalProps> = ({
  report,
  shifts,
  settings,
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen || !report) return null;

  const isAr = lang === 'ar';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/90 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{isAr ? `تقرير الإقفال اليومي الشامل (${report.reportNumber})` : `Daily Z-Report (${report.reportNumber})`}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة تقرير Z-Report' : 'Print Z-Report'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realistic 80mm Thermal Style Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="daily-z-report-printable"
            className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded-lg shadow-md font-mono text-[11px] leading-relaxed border border-slate-200 select-none"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h1 className="font-extrabold text-sm text-slate-950">
                {isAr ? settings.pharmacyNameAr : settings.pharmacyNameEn}
              </h1>
              <p className="text-[10px] text-slate-600 font-sans">
                {isAr ? settings.branchNameAr : settings.branchNameEn}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                {isAr ? 'الرقم الضريبي: ' : 'VAT: '}{settings.taxNumber}
              </p>
              <div className="mt-2 inline-block bg-slate-900 text-white px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                *** {isAr ? 'تقرير الإقفال اليومي الشامل (Z-REPORT)' : 'END OF DAY Z-REPORT'} ***
              </div>
            </div>

            {/* Meta Information */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'رقم التقرير:' : 'Report No:'}</span>
                <span className="font-bold">{report.reportNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'تاريخ اليومية:' : 'Date:'}</span>
                <span className="font-bold">{report.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'توقيت الإغلاق:' : 'Closed At:'}</span>
                <span>{new Date(report.closedAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'المسؤول المشرف:' : 'Auditor:'}</span>
                <span className="font-bold">{report.closedByPharmacist}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'عدد الشيفتات المدمجة:' : 'Total Shifts:'}</span>
                <span className="font-bold">{report.totalShiftsCount} {isAr ? 'شيفت' : 'shifts'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'إجمالي عدد الفواتير:' : 'Total Invoices:'}</span>
                <span className="font-bold">{report.totalInvoicesCount}</span>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="font-bold text-slate-800 mb-1">
                {isAr ? '--- ملخص المبيعات الكلية ---' : '--- SALES TOTALS ---'}
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'إجمالي المبيعات الشاملة:' : 'Gross Sales:'}</span>
                <span>{report.totalGrossSales.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>{isAr ? 'إجمالي الخصومات:' : 'Total Discounts:'}</span>
                <span>-{report.totalDiscount.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between font-bold text-slate-950 pt-1 border-t border-slate-200 text-xs">
                <span>{isAr ? 'صافي المبيعات (Net Sales):' : 'Net Sales:'}</span>
                <span>{report.totalNetSales.toFixed(2)} SAR</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="font-bold text-slate-800 mb-1">
                {isAr ? '--- تفصيل طرق التحصيل ---' : '--- PAYMENT BREAKDOWN ---'}
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'مبيعات الكاش النقدية:' : 'Cash Payments:'}</span>
                <span className="font-bold">{report.totalCashSales.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'مبيعات الشبكة (مدى / فيزا):' : 'Card / Mada:'}</span>
                <span className="font-bold">{report.totalCardSales.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'مبيعات التأمين الطبي:' : 'Insurance:'}</span>
                <span className="font-bold">{report.totalInsuranceSales.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>{isAr ? 'مصروفات وسحوبات الخزينة:' : 'Drawer Withdrawals:'}</span>
                <span>-{report.totalExpenses.toFixed(2)} SAR</span>
              </div>
            </div>

            {/* Cash Drawer Reconciliation */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="font-bold text-slate-800 mb-1">
                {isAr ? '--- مطابقة الخزينة النقدية (CASH AUDIT) ---' : '--- CASH AUDIT ---'}
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'مجموع العهد الافتتاحية:' : 'Total Opening Floats:'}</span>
                <span>{report.totalOpeningCash.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'الرصيد الدفتري المتوقع:' : 'Expected Total Cash:'}</span>
                <span className="font-bold">{report.totalExpectedCash.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'النقدية الفعلية المحصورة:' : 'Actual Counted Cash:'}</span>
                <span className="font-bold">{report.totalActualCashCounted.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span>{isAr ? 'صافي الفارق (عجز / زيادة):' : 'Net Variance:'}</span>
                <span
                  className={
                    report.totalNetVariance === 0
                      ? 'text-emerald-700'
                      : report.totalNetVariance > 0
                      ? 'text-teal-700'
                      : 'text-rose-700'
                  }
                >
                  {report.totalNetVariance > 0 ? '+' : ''}
                  {report.totalNetVariance.toFixed(2)} SAR
                  <span className="text-[9px] font-normal mr-1">
                    {report.totalNetVariance === 0
                      ? (isAr ? ' (متطابق)' : ' (Balanced)')
                      : report.totalNetVariance > 0
                      ? (isAr ? ' (زيادة)' : ' (Surplus)')
                      : (isAr ? ' (عجز)' : ' (Shortage)')}
                  </span>
                </span>
              </div>
            </div>

            {/* Shifts in Day Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="font-bold text-slate-800 mb-1">
                {isAr ? '--- تفصيل الشيفتات المشمولة ---' : '--- SHIFTS INCLUDED ---'}
              </div>
              {shifts.map((s) => (
                <div key={s.id} className="flex justify-between text-[10px] py-0.5">
                  <span>
                    #{s.shiftNumber} - {s.pharmacistName}
                  </span>
                  <span className="font-mono font-bold">
                    {(s.totalCashSales + s.totalCardSales + s.totalInsuranceSales).toFixed(2)} SAR
                  </span>
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div className="pt-4 pb-2 space-y-6 text-[10px]">
              <div className="flex justify-between items-center text-slate-600">
                <div className="text-center">
                  <div className="w-24 border-b border-slate-400 mb-1"></div>
                  <span>{isAr ? 'توقيع الصيدلي المسؤول' : 'Pharmacist'}</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-400 mb-1"></div>
                  <span>{isAr ? 'توقيع المحاسب / الإدارة' : 'Manager / Auditor'}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 font-sans">
                {isAr ? 'تم إغلاق اليومية المحاسبية واعتماد الأرصدة آلياً' : 'Daily ledger officially closed and audited'}
                <br />
                {report.id}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/90 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
          </button>
        </div>
      </div>
    </div>
  );
};
