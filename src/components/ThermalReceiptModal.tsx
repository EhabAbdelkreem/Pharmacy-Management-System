import React from 'react';
import { SalesInvoice, PharmacySettings } from '../types/pharmacy';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface ThermalReceiptModalProps {
  invoice: SalesInvoice | null;
  settings: PharmacySettings;
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  settings,
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen || !invoice) return null;

  const isAr = lang === 'ar';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Actions Bar */}
        <div className="bg-slate-800 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'تم حفظ الفاتورة بنجاح' : 'Invoice Completed Successfully'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الإيصال (80mm)' : 'Print (80mm)'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realistic 80mm Thermal Receipt Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          <div
            id="thermal-receipt-printable"
            className="w-full max-w-[320px] bg-white text-slate-950 p-4 rounded-sm shadow-md font-mono text-[11px] leading-tight select-none"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <div className="w-8 h-8 mx-auto bg-slate-900 text-white rounded-md flex items-center justify-center font-bold text-xs mb-1">
                PC
              </div>
              <h2 className="font-extrabold text-xs text-slate-900">
                {isAr ? settings.pharmacyNameAr : settings.pharmacyNameEn}
              </h2>
              <p className="text-[10px] text-slate-600">
                {isAr ? settings.branchNameAr : settings.branchNameEn}
              </p>
              <p className="text-[10px] text-slate-600">{settings.phone}</p>
              <div className="pt-1 text-[9px] text-slate-700">
                <span>{isAr ? 'الرقم الضريبي (VAT): ' : 'VAT ID: '}</span>
                <span className="font-bold">{settings.taxNumber}</span>
              </div>
              <div className="text-[9px] text-slate-700">
                <span>{isAr ? 'س.ت: ' : 'C.R: '}</span>
                <span>{settings.commercialReg}</span>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                <span>{new Date(invoice.dateTime).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'الصيدلي الكاشير:' : 'Pharmacist:'}</span>
                <span>{invoice.pharmacistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
                <span className="font-bold uppercase">{invoice.paymentMethod}</span>
              </div>
              {invoice.insuranceCompanyName && (
                <>
                  <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-slate-200">
                    <span>{isAr ? 'جهة التعاقد:' : 'Contract/Insurance:'}</span>
                    <span>{invoice.insuranceCompanyName}</span>
                  </div>
                  {invoice.insuranceCardNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{isAr ? 'رقم الكارنيه:' : 'Member Card #:'}</span>
                      <span className="font-bold">{invoice.insuranceCardNumber}</span>
                    </div>
                  )}
                  {invoice.insuranceApprovalNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{isAr ? 'رقم الموافقة:' : 'Approval #:'}</span>
                      <span>{invoice.insuranceApprovalNumber}</span>
                    </div>
                  )}
                  {invoice.patientCoPayAmount !== undefined && (
                    <div className="flex justify-between font-bold text-slate-900 bg-slate-100 p-1 rounded">
                      <span>{isAr ? `تحمل المريض (${invoice.insuranceCoPayPercent || 0}%):` : 'Patient Co-Pay:'}</span>
                      <span>{invoice.patientCoPayAmount.toFixed(2)} SAR</span>
                    </div>
                  )}
                  {invoice.insuranceClaimAmount !== undefined && (
                    <div className="flex justify-between text-teal-800 font-bold">
                      <span>{isAr ? 'مطالبة التأمين الآجلة:' : 'Insurance Claim:'}</span>
                      <span>{invoice.insuranceClaimAmount.toFixed(2)} SAR</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <div className="flex justify-between text-[9px] font-bold pb-1 text-slate-600 border-b border-slate-200">
                <span>{isAr ? 'الصنف / التشغيلة (FEFO)' : 'Item / Batch'}</span>
                <span>{isAr ? 'الكمية × السعر' : 'Qty x Price'}</span>
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
              </div>

              <div className="divide-y divide-slate-100 pt-1 space-y-1">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="pt-1 text-[10px]">
                    <div className="font-bold text-slate-900 flex justify-between">
                      <span>{isAr ? item.tradeNameAr : item.tradeNameEn}</span>
                      <span>{item.lineTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-600">
                      <span>
                        [{item.batchNumber}] ({item.unitType === 'Box' ? (isAr ? 'علبة' : 'Box') : (isAr ? 'شريط' : 'Strip')})
                      </span>
                      <span>
                        {item.quantity} × {item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span>{invoice.subTotal.toFixed(2)} SAR</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{isAr ? 'الخصم المطبق:' : 'Discount:'}</span>
                  <span>-{invoice.discountAmount.toFixed(2)} SAR</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'ضريبة القيمة المضافة (0%):' : 'VAT (0%):'}</span>
                <span>{invoice.taxAmount.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-300">
                <span className="text-slate-900">{isAr ? 'الصافي النهائي:' : 'Net Total:'}</span>
                <span className="font-bold">{invoice.grandTotal.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700 pt-1">
                <span>{isAr ? 'المدفوع نقداً:' : 'Paid Amount:'}</span>
                <span>{invoice.paidAmount.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>{isAr ? 'المتبقي للعميل:' : 'Change:'}</span>
                <span>{invoice.changeAmount.toFixed(2)} SAR</span>
              </div>
            </div>

            {/* ZATCA Phase 2 E-Invoice QR Code */}
            <div className="py-3 text-center border-b border-dashed border-slate-400">
              <div className="flex flex-col items-center justify-center">
                <div className="p-2 border border-slate-400 bg-white inline-block">
                  {/* Visual QR Code rendering */}
                  <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                    {/* QR Code finder patterns */}
                    <rect x="5" y="5" width="28" height="28" fill="#000" />
                    <rect x="9" y="9" width="20" height="20" fill="#fff" />
                    <rect x="13" y="13" width="12" height="12" fill="#000" />

                    <rect x="67" y="5" width="28" height="28" fill="#000" />
                    <rect x="71" y="9" width="20" height="20" fill="#fff" />
                    <rect x="75" y="13" width="12" height="12" fill="#000" />

                    <rect x="5" y="67" width="28" height="28" fill="#000" />
                    <rect x="9" y="71" width="20" height="20" fill="#fff" />
                    <rect x="13" y="75" width="12" height="12" fill="#000" />

                    {/* Data simulation matrix */}
                    <rect x="38" y="10" width="5" height="5" />
                    <rect x="48" y="10" width="5" height="5" />
                    <rect x="42" y="22" width="6" height="6" />
                    <rect x="54" y="22" width="6" height="6" />
                    <rect x="38" y="38" width="8" height="8" />
                    <rect x="52" y="38" width="6" height="6" />
                    <rect x="68" y="42" width="8" height="8" />
                    <rect x="80" y="42" width="6" height="6" />
                    <rect x="38" y="52" width="6" height="6" />
                    <rect x="52" y="52" width="8" height="8" />
                    <rect x="68" y="60" width="6" height="6" />
                    <rect x="80" y="60" width="8" height="8" />
                    <rect x="38" y="70" width="6" height="6" />
                    <rect x="50" y="70" width="8" height="8" />
                    <rect x="40" y="85" width="6" height="6" />
                    <rect x="54" y="85" width="6" height="6" />
                    <rect x="70" y="80" width="8" height="8" />
                    <rect x="84" y="80" width="6" height="6" />
                  </svg>
                </div>
                <span className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">
                  {isAr ? 'فاتورة ضريبية مبسطة (ZATCA / ETA)' : 'Simplified Tax Invoice (ZATCA / ETA)'}
                </span>
                <span className="text-[7px] text-slate-400 font-mono break-all max-w-[200px] mt-0.5 line-clamp-1">
                  {invoice.qrCodeData}
                </span>
              </div>
            </div>

            {/* Insurance Beneficiary Signature Section */}
            {invoice.insuranceCompanyName && (
              <div className="py-2 border-b border-dashed border-slate-400 text-right text-[9px] space-y-1.5">
                <div className="font-bold text-slate-900">
                  {isAr ? 'إقرار واستلام المنتفع / المريض:' : 'Beneficiary Acknowledgement:'}
                </div>
                <div className="text-[8px] text-slate-600">
                  {isAr ? 'أقر باستلام الأدوية الموضحة أعلاه وسداد نسبة التحمل المقررة.' : 'I acknowledge receipt of meds and paying co-pay.'}
                </div>
                <div className="flex justify-between pt-1 text-[8px] font-bold">
                  <span>{isAr ? 'توقيع المستلم:' : 'Sign:'} ____________________</span>
                  <span>{isAr ? 'الهاتف:' : 'Tel:'} ____________</span>
                </div>
              </div>
            )}

            {/* Barcode Footer & Policy */}
            <div className="pt-3 text-center space-y-1 text-[9px] text-slate-600">
              {/* Barcode visual */}
              <div className="flex items-center justify-center gap-0.5 h-6 my-1">
                {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 1, 2, 3, 2, 1, 2, 3, 1, 2].map((w, i) => (
                  <div
                    key={i}
                    className="bg-black h-full"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <p className="font-bold text-[8px] tracking-widest">{invoice.invoiceNumber}</p>
              <p className="pt-1 text-[8px]">
                {isAr
                  ? 'الأدوية المسترجعة تخضع لتعليمات الهيئة العامة للغذاء والدواء خلال 14 يوماً مع أصل الفاتورة'
                  : 'Items subject to return policy within 14 days with original receipt.'}
              </p>
              <p className="font-bold text-slate-900 pt-1 text-[9px]">
                {isAr ? 'دمتم بصحة وعافية - شكراً لثقتكم' : 'Thank you for your visit!'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-800 px-5 py-3 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
          >
            {isAr ? 'إغلاق والعودة للكاشير' : 'Close & Back to POS'}
          </button>
        </div>
      </div>
    </div>
  );
};
