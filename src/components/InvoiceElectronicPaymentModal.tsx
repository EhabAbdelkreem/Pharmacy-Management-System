import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  Sparkles,
  Wifi,
  Activity,
  AlertCircle
} from 'lucide-react';
import { PaymentMethod } from '../types/pharmacy';

interface InvoiceElectronicPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  invoiceTempNumber: string;
  customerName?: string;
  itemsCount: number;
  onConfirmPayment: (method: PaymentMethod, authReference: string, payerNote?: string) => void;
  lang: 'ar' | 'en';
}

export const InvoiceElectronicPaymentModal: React.FC<InvoiceElectronicPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  invoiceTempNumber,
  customerName,
  itemsCount,
  onConfirmPayment,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Sub-tabs: 'card-pos' | 'qr-wallet' | 'fawry' | 'mobile-transfer'
  const [activeChannel, setActiveChannel] = useState<'card-pos' | 'qr-wallet' | 'fawry' | 'mobile-transfer'>('card-pos');
  
  // Card POS Terminal state
  const [posTerminalStatus, setPosTerminalStatus] = useState<'ready' | 'processing' | 'approved'>('ready');
  const [authCode, setAuthCode] = useState(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
  const [cardBrand, setCardBrand] = useState<'Mada' | 'Visa' | 'Mastercard'>('Mada');
  const [cardLast4, setCardLast4] = useState('5892');

  // QR Code state
  const [qrCodeData, setQrCodeData] = useState('');
  const [isQrScanned, setIsQrScanned] = useState(false);

  // Fawry code
  const [fawryBillCode, setFawryBillCode] = useState(`982${Math.floor(10000 + Math.random() * 90000)}`);
  const [copiedFawry, setCopiedFawry] = useState(false);

  // Wallet transfer reference
  const [walletRef, setWalletRef] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Generate simulated dynamic payment QR string
    const qrPayload = `PHARMACORE|INV:${invoiceTempNumber}|AMT:${grandTotal.toFixed(2)}|DATE:${new Date().toISOString()}`;
    setQrCodeData(qrPayload);
  }, [invoiceTempNumber, grandTotal]);

  // Handle Card POS Tap/Insert simulation
  const handleSimulatePosTap = () => {
    setPosTerminalStatus('processing');
    setTimeout(() => {
      setPosTerminalStatus('approved');
      const randomAuth = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      setAuthCode(randomAuth);
    }, 1200);
  };

  // Confirm Final Checkout
  const handleExecutePayment = () => {
    setIsSubmitting(true);
    let finalMethod: PaymentMethod = 'Card';
    let ref = authCode;
    let note = '';

    if (activeChannel === 'card-pos') {
      finalMethod = 'Card';
      ref = authCode || `POS-${Date.now().toString().slice(-6)}`;
      note = `دفع عبر شبكة ${cardBrand} جهاز نقاط البيع - رمز تفويض: ${ref}`;
    } else if (activeChannel === 'qr-wallet') {
      finalMethod = 'OnlineElectronic';
      ref = `QR-${Date.now().toString().slice(-6)}`;
      note = `دفع إلكتروني فوري عبر مسح كود QR للمحفظة / إنستاباي`;
    } else if (activeChannel === 'fawry') {
      finalMethod = 'Fawry';
      ref = `FAWRY-${fawryBillCode}`;
      note = `سداد فوري كود خدمة 788 رقم الفاتورة: ${fawryBillCode}`;
    } else {
      finalMethod = 'VodafoneCash';
      ref = walletRef.trim() || `WALLET-${Date.now().toString().slice(-6)}`;
      note = `تحويل محفظة ذكية / إنستاباي - مرجع: ${ref}`;
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmPayment(finalMethod, ref, note);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">
                  {isAr ? 'الدفع الإلكتروني السريع للفاتورة' : 'Fast Electronic Invoice Checkout'}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-300 animate-pulse" />
                  {isAr ? 'شبكة POS متصلة' : 'POS Online'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? `فاتورة ${invoiceTempNumber} • ${itemsCount} أصناف • ${customerName || 'عميل نقدي'}`
                  : `Invoice ${invoiceTempNumber} • ${itemsCount} items`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Amount Display Banner */}
        <div className="bg-slate-100 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 block">
              {isAr ? 'المبلغ الإجمالي المستحق للتحصيل:' : 'Total Amount Due:'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-black text-2xl text-teal-700 dark:text-teal-400">
                {grandTotal.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                SAR (ريال)
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-mono">
              {new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'شامل ضريبة القيمة المضافة ZATCA' : 'ZATCA Tax Compliant'}
            </span>
          </div>
        </div>

        {/* Channel Navigation Buttons */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveChannel('card-pos')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'card-pos'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isAr ? 'جهاز الشبكة / مدى' : 'Card POS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('qr-wallet')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'qr-wallet'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isAr ? 'مسح QR Code' : 'QR Scan Pay'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('mobile-transfer')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'mobile-transfer'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isAr ? 'محفظة / إنستاباي' : 'Wallets'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('fawry')}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeChannel === 'fawry'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isAr ? 'فوري Fawry' : 'Fawry Pay'}</span>
          </button>
        </div>

        {/* Content Body per Channel */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Channel 1: Card POS Terminal & Mada */}
          {activeChannel === 'card-pos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    {isAr ? 'جهاز نقاط البيع المتصل (POS Network Terminal):' : 'Integrated POS Terminal:'}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {isAr ? 'قرب بطاقة العميل (NFC Contactless) أو أدخل الشريحة في الجهاز' : 'Tap or insert card on POS reader'}
                  </div>
                </div>

                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Ready: COM4
                </span>
              </div>

              {/* Card Terminal Interactive Visual */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-teal-400 font-mono">PHARMACORE EPOS-9000</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-center space-y-2">
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {posTerminalStatus === 'processing'
                      ? (isAr ? 'جاري الاتصال بالبنك وخصم المبلغ...' : 'Authorizing with Bank...')
                      : posTerminalStatus === 'approved'
                      ? (isAr ? '✓ تمت الموافقة والخصم بنجاح!' : '✓ Payment Approved!')
                      : (isAr ? 'بانتظار تمرير بطاقة العميل...' : 'Please tap or insert card')}
                  </span>

                  <div className="font-mono font-black text-2xl text-amber-400">
                    {grandTotal.toFixed(2)} SAR
                  </div>

                  {posTerminalStatus === 'approved' && (
                    <div className="p-2 bg-emerald-950/60 rounded-lg border border-emerald-500/40 text-[11px] text-emerald-300 font-mono flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{authCode} • MADA •••• {cardLast4}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {(['Mada', 'Visa', 'Mastercard'] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCardBrand(b)}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                          cardBrand === b ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulatePosTap}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تمرير بطاقة العميل (Tap)' : 'Simulate Tap'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Channel 2: QR Code Scan Pay */}
          {activeChannel === 'qr-wallet' && (
            <div className="space-y-4 text-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                {isAr ? 'اطلب من العميل مسح الكود من تطبيق البنك أو المحفظة الذكية:' : 'Scan QR code with banking or wallet app:'}
              </span>

              {/* Dynamic QR Code Display */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-teal-500 shadow-md flex flex-col items-center justify-center relative">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  {/* Stylized QR Matrix Pattern */}
                  <rect x="10" y="10" width="24" height="24" fill="#0f766e" rx="3" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="#0f766e" />

                  <rect x="66" y="10" width="24" height="24" fill="#0f766e" rx="3" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="#0f766e" />

                  <rect x="10" y="66" width="24" height="24" fill="#0f766e" rx="3" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="#0f766e" />

                  {/* Dynamic Pattern Dots */}
                  <rect x="42" y="12" width="6" height="6" fill="#1e293b" />
                  <rect x="52" y="18" width="6" height="6" fill="#1e293b" />
                  <rect x="42" y="28" width="8" height="8" fill="#0f766e" />
                  <rect x="54" y="32" width="6" height="6" fill="#1e293b" />
                  <rect x="14" y="44" width="8" height="8" fill="#1e293b" />
                  <rect x="28" y="44" width="8" height="8" fill="#0f766e" />
                  <rect x="42" y="44" width="16" height="16" fill="#0f766e" rx="2" />
                  <rect x="66" y="44" width="8" height="8" fill="#1e293b" />
                  <rect x="80" y="44" width="8" height="8" fill="#1e293b" />
                  <rect x="42" y="66" width="8" height="8" fill="#1e293b" />
                  <rect x="54" y="74" width="6" height="6" fill="#0f766e" />
                  <rect x="68" y="68" width="8" height="8" fill="#1e293b" />
                  <rect x="80" y="78" width="8" height="8" fill="#0f766e" />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg bg-white border border-teal-600 flex items-center justify-center text-teal-700 font-black text-[10px] shadow-sm">
                    PAY
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-mono font-bold text-xs text-teal-700 dark:text-teal-400">
                  {grandTotal.toFixed(2)} SAR • {invoiceTempNumber}
                </span>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'متوافق مع Apple Pay، محافظ البنوك السعودية، وإنستاباي' : 'Supports Apple Pay, Banking Apps & Wallets'}
                </p>
              </div>
            </div>
          )}

          {/* Channel 3: Mobile Wallets & InstaPay */}
          {activeChannel === 'mobile-transfer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
                <span className="font-bold text-rose-900 dark:text-rose-200 block">
                  {isAr ? 'بيانات استقبال التحويل الفوري للصيدلية:' : 'Pharmacy Receiving Wallet Details:'}
                </span>

                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <span className="text-slate-500">{isAr ? 'محفظة الهاتف / كاش:' : 'Mobile Wallet:'}</span>
                  <span className="font-mono font-black text-rose-600 text-sm select-all">0100 123 4567</span>
                </div>

                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <span className="text-slate-500">{isAr ? 'عنوان إنستاباي IPA:' : 'InstaPay IPA:'}</span>
                  <span className="font-mono font-black text-teal-600 text-xs select-all">pharmacy@instapay</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <label className="text-slate-600 dark:text-slate-400 block font-bold">
                  {isAr ? 'رقم العملية / المرجع التأكيدي (اختياري للتوثيق):' : 'Transaction Ref ID:'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: VF-9812409"
                  value={walletRef}
                  onChange={(e) => setWalletRef(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Channel 4: Fawry Pay */}
          {activeChannel === 'fawry' && (
            <div className="space-y-4 text-center">
              <div className="bg-amber-500/10 border-2 border-dashed border-amber-400 dark:border-amber-700 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold block">
                  {isAr ? 'كود سداد الفاتورة عبر شبكة فوري (كود الخدمة: 788):' : 'Fawry Bill Reference Code:'}
                </span>
                <div className="font-mono font-black text-3xl text-amber-600 tracking-wider">
                  {fawryBillCode}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fawryBillCode);
                      setCopiedFawry(true);
                      setTimeout(() => setCopiedFawry(false), 2000);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedFawry ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFawry ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ كود فوري' : 'Copy Code')}</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? 'يمكن للعميل سداد القيمة عبر تطبيق myFawry أو أي ماكينة فوري بإدخال الكود المرجعي أعلاه.'
                  : 'Customer can pay via myFawry app or any POS kiosk using the code above.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer & Confirmation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleExecutePayment}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isAr ? 'جاري توثيق الدفع...' : 'Verifying Payment...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>
                  {isAr
                    ? `تأكيد استلام الدفع الإلكتروني (${grandTotal.toFixed(2)} SAR) وطباعة الفاتورة`
                    : `Confirm Electronic Payment & Print (${grandTotal.toFixed(2)} SAR)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
