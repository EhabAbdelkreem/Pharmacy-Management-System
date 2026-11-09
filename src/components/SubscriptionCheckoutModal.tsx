import React, { useState, useEffect } from 'react';
import { 
  BillingCycle, 
  PaymentGatewayType, 
  PaymentGatewayConfig, 
  SubscriptionTransaction,
  SaaSClient
} from '../types/pharmacy';
import { PRICING_PLANS } from '../data/mockData';
import { apiClient } from '../services/apiClient';
import { 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Copy, 
  Check, 
  Clock, 
  Smartphone, 
  Building2, 
  ArrowRight, 
  X, 
  Receipt, 
  Printer, 
  HelpCircle,
  FileCheck2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: SaaSClient | null;
  defaultPlan?: BillingCycle;
  defaultCurrency?: 'SAR' | 'EGP';
  gatewayConfig?: PaymentGatewayConfig;
  onPaymentSuccess: (transaction: SubscriptionTransaction) => void;
  lang: 'ar' | 'en';
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  isOpen,
  onClose,
  client,
  defaultPlan = 'Annual',
  defaultCurrency = 'SAR',
  gatewayConfig,
  onPaymentSuccess,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const [selectedPlan, setSelectedPlan] = useState<BillingCycle>(defaultPlan);
  const [currency, setCurrency] = useState<'SAR' | 'EGP'>(defaultCurrency);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('stripe');

  // Client Details (can be edited or pre-filled)
  const [pharmacyName, setPharmacyName] = useState(client?.pharmacyName || 'صيدلية تجريبية جديدة');
  const [ownerName, setOwnerName] = useState(client?.ownerName || 'د. الصيدلي المالك');
  const [phone, setPhone] = useState(client?.phone || '+966 50 123 4567');
  const [email, setEmail] = useState(client?.email || 'owner@pharmacy.com');

  // Stripe Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(client?.ownerName || '');
  const [is3DSecureActive, setIs3DSecureActive] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Fawry Inputs
  const [fawryRefCode, setFawryRefCode] = useState('');
  const [fawryExpireDate, setFawryExpireDate] = useState('');
  const [copiedFawry, setCopiedFawry] = useState(false);

  // Cash / Wallet Inputs
  const [walletRefNumber, setWalletRefNumber] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  // Submission & Flow States
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<SubscriptionTransaction | null>(null);

  // Pre-calculate price for selected plan & currency
  const planObj = PRICING_PLANS.find((p) => p.id === selectedPlan) || PRICING_PLANS[1];
  const finalAmount = currency === 'SAR' ? planObj.priceSAR : planObj.priceEGP;

  // Generate Fawry Reference code on mount or when Fawry selected
  useEffect(() => {
    if (selectedGateway === 'fawry' && !fawryRefCode) {
      const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      const expire = new Date();
      expire.setHours(expire.getHours() + 48);
      setFawryRefCode(randomCode.replace(/(\d{3})(\d{3})(\d{2})/, '$1 $2 $3'));
      setFawryExpireDate(expire.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }, [selectedGateway, fawryRefCode, isAr]);

  // Card formatting
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Detect card brand
  const getCardBrand = () => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    if (num.startsWith('588845') || num.startsWith('440647') || num.startsWith('440795')) return 'Mada';
    return 'CreditCard';
  };

  // Submit Payment Handler
  const handleProcessPayment = async () => {
    setIsProcessing(true);

    try {
      // Simulate gateway authorization latency
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const txId = `tx-${Date.now()}`;
      let refNumber = `REF-${Date.now()}`;
      let notes = '';

      if (selectedGateway === 'stripe') {
        refNumber = `pi_live_${Math.random().toString(36).substring(2, 12)}`;
        notes = `تم السداد بنجاح عبر بوابة Stripe ببطاقة ${getCardBrand()} المنتهية برقم ${cardNumber.slice(-4) || '4242'}`;
      } else if (selectedGateway === 'fawry') {
        refNumber = `FAWRY-${fawryRefCode.replace(/\s/g, '')}`;
        notes = `تم سداد كود فوري المرجعي ${fawryRefCode} بنجاح لدى منافذ فوري`;
      } else if (selectedGateway === 'vodafone_cash' || selectedGateway === 'instapay') {
        refNumber = walletRefNumber.trim() || `WALLET-${Math.floor(1000000 + Math.random() * 9000000)}`;
        notes = `تم التحويل عبر محفظة الهاتف/إنستاباي برقم مرجعي: ${refNumber}`;
      } else {
        refNumber = `CASH-INVOICE-${Date.now().toString().slice(-6)}`;
        notes = `شراء كاش نقدي مباشر مع ترخيص رسمي مسجل`;
      }

      const newTx: SubscriptionTransaction = {
        id: txId,
        clientId: client?.id || `cli-${Date.now().toString().slice(-4)}`,
        pharmacyName,
        payerName: ownerName,
        payerPhone: phone,
        plan: selectedPlan,
        gateway: selectedGateway,
        amount: finalAmount,
        currency,
        status: 'Completed',
        referenceNumber: refNumber,
        cardLast4: selectedGateway === 'stripe' ? (cardNumber.slice(-4) || '4242') : undefined,
        cardBrand: selectedGateway === 'stripe' ? getCardBrand() : undefined,
        fawryRefCode: selectedGateway === 'fawry' ? fawryRefCode : undefined,
        fawryExpireAt: selectedGateway === 'fawry' ? fawryExpireDate : undefined,
        vodafoneCashRef: (selectedGateway === 'vodafone_cash' || selectedGateway === 'instapay') ? refNumber : undefined,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        receiptNotes: notes,
      };

      // Save via API
      await apiClient.createTransaction(newTx);

      setCompletedTransaction(newTx);
      onPaymentSuccess(newTx);
    } catch (err) {
      console.error('Payment error:', err);
      alert(isAr ? 'حدث خطأ أثناء الاتصال ببوابة الدفع، يرجى المحاولة ثانية' : 'Payment gateway error');
    } finally {
      setIsProcessing(false);
      setIs3DSecureActive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">
                  {isAr ? 'بوابة الدفع وتجديد الاشتراك (Stripe / Fawry / Cash)' : 'Subscription Checkout & Payment Gateways'}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  256-bit SSL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'اختر خطة الاشتراك وادفع مباشرة بالفيزا، فوري، المحافظ، أو التحويل الكاش'
                  : 'Choose plan and pay via Credit Card, Fawry, Mobile Wallets or Cash'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        {completedTransaction ? (
          /* ======================================================== */
          /* SUCCESS CONFIRMATION & OFFICIAL RECEIPT                  */
          /* ======================================================== */
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-slate-900 dark:text-white">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {isAr ? 'تمت عملية السداد وتفعيل الاشتراك بنجاح!' : 'Payment Completed & License Activated!'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {isAr
                  ? `تم توثيق العملية برقم مرجعي وتحديث حساب صيدلية ${completedTransaction.pharmacyName} على السحابة المركزية مباشرة.`
                  : `Transaction verified and synced to Cloud SQL for ${completedTransaction.pharmacyName}.`}
              </p>
            </div>

            {/* Official Digital Invoice Card */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold text-slate-500">{isAr ? 'رقم الإيصال المرجعي:' : 'Reference No:'}</span>
                <span className="font-bold text-teal-700 dark:text-teal-400 select-all">{completedTransaction.referenceNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'الصيدلية:' : 'Pharmacy:'}</span>
                  <span className="font-bold">{completedTransaction.pharmacyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'المالك / المشتري:' : 'Owner:'}</span>
                  <span className="font-bold">{completedTransaction.payerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'نوع الباقة:' : 'Plan:'}</span>
                  <span className="font-bold text-amber-600">
                    {completedTransaction.plan === 'LifetimeCash' 
                      ? (isAr ? 'شراء كاش مدى الحياة' : 'Lifetime Cash') 
                      : completedTransaction.plan === 'Annual' 
                      ? (isAr ? 'اشتراك سنوي (12 شهر)' : 'Annual Subscription') 
                      : (isAr ? 'اشتراك شهري' : 'Monthly Subscription')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'بوابة السداد:' : 'Gateway:'}</span>
                  <span className="font-bold uppercase">{completedTransaction.gateway}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'المبلغ المدفوع:' : 'Amount Paid:'}</span>
                  <span className="font-black text-sm text-emerald-600">
                    {completedTransaction.amount.toLocaleString()} {completedTransaction.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'تاريخ السداد:' : 'Date:'}</span>
                  <span>{completedTransaction.createdAt}</span>
                </div>
              </div>

              {completedTransaction.receiptNotes && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  {completedTransaction.receiptNotes}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'طباعة إيصال السداد الرسمي' : 'Print Official Receipt'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition"
              >
                {isAr ? 'تم، العودة للبرنامج' : 'Done & Return'}
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CHECKOUT STEP: SELECT PLAN & GATEWAY & PAY               */
          /* ======================================================== */
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
            {/* Step 1: Plan Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {isAr ? '1. اختر باقة الاشتراك أو الشراء:' : '1. Select Plan / Purchase Model:'}
                </span>

                {/* Currency Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setCurrency('SAR')}
                    className={`px-3 py-1 rounded-lg transition ${
                      currency === 'SAR' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    SAR (ريال)
                  </button>
                  <button
                    onClick={() => setCurrency('EGP')}
                    className={`px-3 py-1 rounded-lg transition ${
                      currency === 'EGP' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    EGP (جنيه)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const price = currency === 'SAR' ? plan.priceSAR : plan.priceEGP;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {plan.badgeAr && (
                        <span className="absolute -top-2.5 right-3 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase shadow-xs">
                          {plan.badgeAr}
                        </span>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {isAr ? plan.titleAr : plan.titleEn}
                          </h4>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                        </div>

                        <div className="pt-2">
                          <span className="font-mono font-black text-xl text-teal-700 dark:text-teal-400">
                            {price.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 mr-1 ml-1">
                            {currency}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            / {plan.periodAr}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-tight pt-1">
                          {plan.descriptionAr}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                        {plan.featuresAr.slice(0, 2).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-teal-500 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Payment Gateway Selector */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? '2. اختر وسيلة وبوابة الدفع المفضلة:' : '2. Choose Payment Gateway:'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Stripe Credit Card */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway('stripe')}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer flex flex-col justify-between ${
                    selectedGateway === 'stripe'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Stripe</span>
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {isAr ? 'بطاقة بنكية / فيزا / مدى' : 'Visa / Mastercard / Mada'}
                  </span>
                </button>

                {/* Fawry Pay */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway('fawry')}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer flex flex-col justify-between ${
                    selectedGateway === 'fawry'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Fawry فوري</span>
                    <Receipt className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {isAr ? 'رقم مرجعي / كود سداد' : 'Fawry Code at Kiosks'}
                  </span>
                </button>

                {/* Vodafone Cash & Wallets */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway('vodafone_cash')}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer flex flex-col justify-between ${
                    selectedGateway === 'vodafone_cash'
                      ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">فودافون كاش</span>
                    <Smartphone className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {isAr ? 'محفظة الهاتف الذكية' : 'Mobile Cash Wallet'}
                  </span>
                </button>

                {/* Direct Cash / Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway('cash')}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer flex flex-col justify-between ${
                    selectedGateway === 'cash'
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{isAr ? 'شراء كاش' : 'Direct Cash'}</span>
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {isAr ? 'تحويل بنكي / إيصال رسمي' : 'Bank IBAN / Cash'}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 3: Gateway Payment Form */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-4">
              {/* Stripe Payment Form */}
              {selectedGateway === 'stripe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      {isAr ? 'بوابة الدفع الإلكتروني الآمنة (Stripe Hosted Elements):' : 'Stripe Secure Card Payment:'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <span>Visa</span> • <span>Mastercard</span> • <span>Mada</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        {isAr ? 'اسم حامل البطاقة:' : 'Cardholder Name:'}
                      </label>
                      <input
                        type="text"
                        placeholder="Dr. Mohamed Ahmed"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        {isAr ? 'رقم البطاقة الائتمانية (16 رقم):' : 'Card Number:'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4242 •••• •••• 4242"
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white pl-12"
                        />
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                          {getCardBrand()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                          {isAr ? 'تاريخ الانتهاء (MM/YY):' : 'Expiry Date:'}
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-center text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                          {isAr ? 'رمز الأمان (CVC):' : 'CVC / CVV:'}
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-center text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fawry Payment Code */}
              {selectedGateway === 'fawry' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" />
                      {isAr ? 'الدفع عبر منافذ وتطبيق فوري (Fawry Pay):' : 'Fawry Payment Details:'}
                    </span>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      كود الخدمة: 788
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-center space-y-2">
                    <span className="text-xs text-slate-500 font-bold block">
                      {isAr ? 'الرقم المرجعي المخصص لسداد صيدليتك:' : 'Fawry Reference Number:'}
                    </span>
                    <div className="font-mono font-black text-2xl text-amber-600 tracking-wider">
                      {fawryRefCode}
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fawryRefCode.replace(/\s/g, ''));
                          setCopiedFawry(true);
                          setTimeout(() => setCopiedFawry(false), 2000);
                        }}
                        className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition"
                      >
                        {copiedFawry ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFawry ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ كود فوري' : 'Copy Code')}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{isAr ? `صالح للسداد حتى: ${fawryExpireDate}` : `Valid until: ${fawryExpireDate}`}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      {isAr ? 'خطوات السداد:' : 'Payment Steps:'}
                    </p>
                    <p className="text-[11px]">
                      {isAr
                        ? '1. توجه لأي منفذ فوري أو افتح تطبيق myFawry.'
                        : '1. Visit any Fawry kiosk or open myFawry app.'}
                    </p>
                    <p className="text-[11px]">
                      {isAr
                        ? '2. اختر "مدفوعات فوري إكسبريس" أو كود الخدمة 788 ثم ادخل الرقم المرجعي أعلاه.'
                        : '2. Select Fawry Express service code 788 and enter the reference number.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Vodafone Cash & InstaPay */}
              {selectedGateway === 'vodafone_cash' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      {isAr ? 'التحويل عبر فودافون كاش وإنستاباي (Wallets & InstaPay):' : 'Mobile Cash Wallets:'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
                      <span className="text-slate-500 text-[10px] block font-bold">{isAr ? 'رقم محفظة فودافون كاش:' : 'Vodafone Cash Number:'}</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-rose-600 text-sm">
                          {gatewayConfig?.vodafoneCash.walletNumber || '0100 123 4567'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(gatewayConfig?.vodafoneCash.walletNumber || '01001234567');
                            setCopiedWallet(true);
                            setTimeout(() => setCopiedWallet(false), 2000);
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          {copiedWallet ? '✓' : (isAr ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{gatewayConfig?.vodafoneCash.accountHolder || 'إدارة فارماكور الطبية'}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
                      <span className="text-slate-500 text-[10px] block font-bold">{isAr ? 'عنوان إنستاباي (InstaPay IPA):' : 'InstaPay IPA Address:'}</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-teal-600 text-sm">
                          {gatewayConfig?.instaPay.ipaHandle || 'pharmacore@instapay'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{gatewayConfig?.instaPay.accountHolder || 'PharmaCore Medical'}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'رقم عملية التحويل أو رسالة التأكيد:' : 'Wallet Transfer Reference ID:'}
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: VF-9812409 أو رقم العملية"
                      value={walletRefNumber}
                      onChange={(e) => setWalletRefNumber(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Direct Cash / Bank Transfer */}
              {selectedGateway === 'cash' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {isAr ? 'التحويل البنكي الرسمي والشراء الكاش المباشر:' : 'Direct Cash & Bank Transfer:'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{isAr ? 'البنك والحساب المعتمد:' : 'Bank Name:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {gatewayConfig?.bankTransfer.bankName || 'مصرف الراجحي / البنك الأهلي'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{isAr ? 'رقم الآيبان (IBAN):' : 'IBAN:'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white select-all text-[11px]">
                          {gatewayConfig?.bankTransfer.iban || 'SA0380000000608010167519'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(gatewayConfig?.bankTransfer.iban || 'SA0380000000608010167519');
                            setCopiedIban(true);
                            setTimeout(() => setCopiedIban(false), 2000);
                          }}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-bold"
                        >
                          {copiedIban ? '✓' : (isAr ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{isAr ? 'اسم المستفيد:' : 'Beneficiary:'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {gatewayConfig?.bankTransfer.accountHolder || 'مؤسسة فارماكور للحلول الطبية'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
                    {isAr
                      ? 'عند الشراء الكاش أو التحويل البنكي، يتم تفعيل ترخيص المنظومة فوراً وتوليد فاتورة ضريبية رسمية مختومة.'
                      : 'Immediate license activation with official stamped tax receipt.'}
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary & Checkout Button */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500 block">
                  {isAr ? 'إجمالي المبلغ المستحق للسداد:' : 'Total Payable Amount:'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-black text-2xl text-teal-700 dark:text-teal-400">
                    {finalAmount.toLocaleString()}
                  </span>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    {currency}
                  </span>
                  <span className="text-[10px] text-slate-500 mr-2 ml-2">
                    ({planObj.titleAr} - {planObj.periodAr})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessPayment}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isAr ? 'جاري الاتصال بالبوابة وتأكيد السداد...' : 'Processing Gateway Payment...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>
                        {selectedGateway === 'stripe'
                          ? (isAr ? `تأكيد الدفع بالبطاقة (${finalAmount.toLocaleString()} ${currency})` : 'Pay with Card')
                          : selectedGateway === 'fawry'
                          ? (isAr ? 'تأكيد السداد عبر فوري' : 'Confirm Fawry Payment')
                          : selectedGateway === 'vodafone_cash'
                          ? (isAr ? 'تأكيد تحويل المحفظة' : 'Confirm Wallet Transfer')
                          : (isAr ? 'تأكيد الشراء الكاش' : 'Confirm Cash Purchase')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
