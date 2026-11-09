import React from 'react';
import { Medicine, UnitType } from '../types/pharmacy';
import { calculateTotalStock, getFefoBatch, getExpiryStatus } from '../services/fefoEngine';
import { X, Check, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AlternativesModalProps {
  sourceMedicine: Medicine;
  allMedicines: Medicine[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAlternative: (medicine: Medicine) => void;
  lang: 'ar' | 'en';
}

export const AlternativesModal: React.FC<AlternativesModalProps> = ({
  sourceMedicine,
  allMedicines,
  isOpen,
  onClose,
  onSelectAlternative,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Find alternatives with identical or matching active ingredients
  const sourceIng = sourceMedicine.activeIngredientEn.toLowerCase();
  const alternatives = allMedicines.filter((m) => {
    if (m.id === sourceMedicine.id) return false;
    const targetIng = m.activeIngredientEn.toLowerCase();
    return (
      (targetIng.includes(sourceIng) || sourceIng.includes(targetIng)) &&
      m.dosageForm === sourceMedicine.dosageForm
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isAr ? 'البدائل الدوائية والمثائل المتطابقة (Generic Equivalents)' : 'Therapeutic Equivalents & Generic Alternatives'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr
                  ? `المادة الفعالة: ${sourceMedicine.activeIngredientAr} (${sourceMedicine.dosageForm})`
                  : `Active: ${sourceMedicine.activeIngredientEn} (${sourceMedicine.dosageForm})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Source Medicine Reference Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">{isAr ? 'الدواء الأصلي المطلوب:' : 'Original Item:'}</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
              {isAr ? sourceMedicine.tradeNameAr : sourceMedicine.tradeNameEn}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">{isAr ? 'السعر الحالي:' : 'Original Price:'}</span>
            <span className="font-bold text-teal-700 dark:text-teal-400 font-mono text-sm">
              {sourceMedicine.pricePerBox.toFixed(2)} SAR
            </span>
          </div>
        </div>

        {/* Alternatives List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {alternatives.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'لا توجد بدائل مباشرة بنفس المادة الفعالة حالياً في المخزن' : 'No direct generic alternatives found in inventory'}
              </p>
              <p className="text-xs text-slate-500">
                {isAr ? 'يرجى مراجعة الطبيب المعالج لتغيير المجموعة العلاجية' : 'Consult prescribing physician for alternative class'}
              </p>
            </div>
          ) : (
            alternatives.map((alt) => {
              const stock = calculateTotalStock(alt);
              const bestBatch = getFefoBatch(alt, 'Box');
              const priceDiff = alt.pricePerBox - sourceMedicine.pricePerBox;
              const expiryInfo = bestBatch ? getExpiryStatus(bestBatch.expiryDate) : null;

              return (
                <div
                  key={alt.id}
                  className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {isAr ? alt.tradeNameAr : alt.tradeNameEn}
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                        {alt.barcode}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      {isAr ? alt.activeIngredientAr : alt.activeIngredientEn}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        stock.totalBoxes > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isAr ? `المتوفر: ${stock.totalBoxes} علبة` : `In Stock: ${stock.totalBoxes} boxes`}
                      </span>

                      {bestBatch && expiryInfo && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${expiryInfo.badgeColor}`}>
                          FEFO: {bestBatch.batchNumber}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono">
                        {isAr ? `الرف: ${bestBatch?.shelfLocation || 'A-01'}` : `Shelf: ${bestBatch?.shelfLocation || 'A-01'}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                    <div className="text-right">
                      <div className="font-mono font-bold text-teal-700 dark:text-teal-400 text-base">
                        {alt.pricePerBox.toFixed(2)} SAR
                      </div>
                      <div className={`text-[11px] font-bold ${
                        priceDiff < 0 ? 'text-emerald-700 dark:text-emerald-400' : priceDiff > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'
                      }`}>
                        {priceDiff < 0
                          ? (isAr ? `أوفر بـ ${Math.abs(priceDiff).toFixed(2)} ريال` : `Save ${Math.abs(priceDiff).toFixed(2)} SAR`)
                          : priceDiff > 0
                          ? (isAr ? `فارق +${priceDiff.toFixed(2)} ريال` : `+${priceDiff.toFixed(2)} SAR`)
                          : (isAr ? 'نفس السعر تماماً' : 'Same Price')}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectAlternative(alt);
                        onClose();
                      }}
                      disabled={stock.totalBoxes <= 0}
                      className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAr ? 'صرف هذا البديل' : 'Dispense Alternative'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'يتم مطابقة التركيز الدوائي والشكل الصيدلاني تلقائياً' : 'Matches Active Strength and Dosage Form Automatically'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
