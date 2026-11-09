import React, { useState, useEffect, useRef } from 'react';
import { 
  Medicine, 
  CartItem, 
  UnitType, 
  PaymentMethod, 
  SalesInvoice, 
  Shift, 
  PharmacySettings,
  InsuranceContract,
  InsuranceClaim
} from '../types/pharmacy';
import { getFefoBatch, calculateTotalStock, getExpiryStatus } from '../services/fefoEngine';
import { detectDrugInteractions, DetectedConflict, getSeverityBadgeStyle } from '../services/interactionEngine';
import { generateZatcaTlvBase64 } from '../services/zatcaQr';
import { AlternativesModal } from './AlternativesModal';
import { InvoiceElectronicPaymentModal } from './InvoiceElectronicPaymentModal';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  AlertOctagon, 
  Printer, 
  CreditCard, 
  Banknote, 
  Layers, 
  RefreshCw, 
  Check, 
  Zap,
  Info,
  Package,
  Activity,
  Receipt,
  QrCode,
  Smartphone,
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  Sparkles,
  Wifi
} from 'lucide-react';

interface PosTerminalProps {
  medicines: Medicine[];
  currentShift: Shift | null;
  settings: PharmacySettings;
  onInvoiceCreated: (invoice: SalesInvoice) => void;
  lang: 'ar' | 'en';
  onOpenReceipt: (invoice: SalesInvoice) => void;
  onNavigateToShifts?: () => void;
  externalBarcodeToScan?: string | null;
  onClearExternalBarcode?: () => void;
  contracts?: InsuranceContract[];
  onClaimCreated?: (claim: InsuranceClaim) => void;
  currentUser?: import('../types/pharmacy').PharmacistUser | null;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  medicines,
  currentShift,
  settings,
  onInvoiceCreated,
  lang,
  onOpenReceipt,
  onNavigateToShifts,
  externalBarcodeToScan,
  onClearExternalBarcode,
  contracts = [],
  onClaimCreated,
  currentUser,
}) => {
  const isAr = lang === 'ar';
  const canGiveDiscount = currentUser ? currentUser.permissions.canGiveDiscount : true;
  const maxAllowedDiscount = currentUser?.permissions.canGiveDiscount
    ? currentUser.permissions.maxDiscountPercent
    : (currentUser?.role === 'Admin' ? 100 : 0);

  // Cart & Invoice State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedAltSource, setSelectedAltSource] = useState<Medicine | null>(null);
  const [focusedCartIndex, setFocusedCartIndex] = useState<number>(0);
  
  // Fast Search & Scanner State
  const [searchInputVal, setSearchInputVal] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showElectronicPayModal, setShowElectronicPayModal] = useState(false);

  // Card POS State
  const [cardAuthCode, setCardAuthCode] = useState<string>('');
  const [isCardTapSuccess, setIsCardTapSuccess] = useState(false);

  // Insurance & Corporate Contract State
  const [selectedContractId, setSelectedContractId] = useState<string>(contracts[0]?.id || '');
  const [insuranceCardNumber, setInsuranceCardNumber] = useState<string>('');
  const [insuranceApprovalNumber, setInsuranceApprovalNumber] = useState<string>('');
  const [insuranceCoPayPercent, setInsuranceCoPayPercent] = useState<number>(
    contracts[0]?.defaultCoPayPercent ?? 10
  );
  const [coPayPaymentMode, setCoPayPaymentMode] = useState<'Cash' | 'Card'>('Cash');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Keep contract selection updated when contracts load
  useEffect(() => {
    if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
      setInsuranceCoPayPercent(contracts[0].defaultCoPayPercent);
    }
  }, [contracts, selectedContractId]);

  // Update co-pay percent when changing contract
  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    const found = contracts.find((c) => c.id === contractId);
    if (found) {
      setInsuranceCoPayPercent(found.defaultCoPayPercent);
    }
  };

  // Global Barcode & Hotkeys Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Pharmacy Hotkeys
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          toggleUnitType(focusedCartIndex);
        }
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSearchResults(false);
        if (cart.length > 0 && !isInput) {
          if (confirm(isAr ? 'هل تريد إفراغ السلة الحالية بالكامل؟' : 'Clear current cart?')) {
            setCart([]);
          }
        }
        return;
      }

      // Hardware Barcode Scanner interception
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          handleBarcodeScanned(buffer);
          buffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, focusedCartIndex, isAr]);

  // External Barcode Scan (e.g. mobile camera or external event)
  useEffect(() => {
    if (externalBarcodeToScan) {
      handleBarcodeScanned(externalBarcodeToScan);
      onClearExternalBarcode?.();
    }
  }, [externalBarcodeToScan]);

  // Handle Barcode Scanned
  const handleBarcodeScanned = (barcode: string) => {
    const matchedMedicine = medicines.find(
      (m) => m.barcode === barcode || m.internalCode.toLowerCase() === barcode.toLowerCase()
    );

    if (matchedMedicine) {
      addToCart(matchedMedicine, 'Box');
      setSearchInputVal('');
      setShowSearchResults(false);
    } else {
      alert(isAr ? `لم يتم العثور على دواء بالباركود: ${barcode}` : `No medicine found for barcode: ${barcode}`);
    }
  };

  // Add Medicine to Cart with FEFO engine
  const addToCart = (medicine: Medicine, preferredUnit: UnitType = 'Box') => {
    const fefoBatch = getFefoBatch(medicine, preferredUnit);

    if (!fefoBatch) {
      alert(
        isAr
          ? `عفواً، الصنف ${medicine.tradeNameAr} غير متوفر منه رصيد كافي حالياً!`
          : `Sorry, insufficient stock for ${medicine.tradeNameEn}!`
      );
      return;
    }

    const price = preferredUnit === 'Box' ? medicine.pricePerBox : medicine.pricePerStrip;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) =>
          item.medicine.id === medicine.id &&
          item.unitType === preferredUnit &&
          item.selectedBatch.id === fefoBatch.id
      );

      if (existingIdx > -1) {
        const updated = [...prevCart];
        const item = updated[existingIdx];
        const newQty = item.quantity + 1;
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          lineTotal: newQty * item.unitPrice * (1 - item.discountPercent / 100),
        };
        setFocusedCartIndex(existingIdx);
        return updated;
      } else {
        const newItem: CartItem = {
          medicine,
          selectedBatch: fefoBatch,
          unitType: preferredUnit,
          quantity: 1,
          unitPrice: price,
          discountPercent: 0,
          lineTotal: price,
          isFefoAutoSelected: true,
        };
        setFocusedCartIndex(prevCart.length);
        return [...prevCart, newItem];
      }
    });

    setSearchInputVal('');
    setShowSearchResults(false);
  };

  // Toggle Unit Type (Box vs Strip)
  const toggleUnitType = (index: number) => {
    setCart((prev) => {
      if (!prev[index]) return prev;
      const item = prev[index];
      const newUnit: UnitType = item.unitType === 'Box' ? 'Strip' : 'Box';
      const newBatch = getFefoBatch(item.medicine, newUnit);

      if (!newBatch) {
        alert(isAr ? 'لا يوجد رصيد كافي لهذه الوحدة' : 'Insufficient stock for this unit');
        return prev;
      }

      const newPrice = newUnit === 'Box' ? item.medicine.pricePerBox : item.medicine.pricePerStrip;

      const updated = [...prev];
      updated[index] = {
        ...item,
        unitType: newUnit,
        selectedBatch: newBatch,
        unitPrice: newPrice,
        lineTotal: item.quantity * newPrice * (1 - item.discountPercent / 100),
      };
      return updated;
    });
  };

  // Update Quantity
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        quantity: newQty,
        lineTotal: newQty * item.unitPrice * (1 - item.discountPercent / 100),
      };
      return updated;
    });
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Detect Drug Interactions in Real Time
  const detectedConflicts: DetectedConflict[] = detectDrugInteractions(cart);

  // Financial Calculations
  const subTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const calculatedDiscount = (subTotal * discountPercent) / 100;
  const grandTotal = Math.max(0, subTotal - calculatedDiscount);

  // Contract Financial Calculations when Payment Method is Insurance
  const currentContract = contracts.find((c) => c.id === selectedContractId);
  const contractDiscountAmount = currentContract ? (grandTotal * currentContract.discountPercent) / 100 : 0;
  const netAfterContractDiscount = Math.max(0, grandTotal - contractDiscountAmount);
  
  // Co-Pay calculation
  let patientCoPayAmount = (netAfterContractDiscount * insuranceCoPayPercent) / 100;
  if (currentContract?.maxCoPayCap && currentContract.maxCoPayCap > 0) {
    patientCoPayAmount = Math.min(patientCoPayAmount, currentContract.maxCoPayCap);
  }
  const insuranceClaimAmount = Math.max(0, netAfterContractDiscount - patientCoPayAmount);

  // Cash tender calculations
  const effectiveDueAmount = paymentMethod === 'Insurance' ? patientCoPayAmount : grandTotal;
  const numPaid = parseFloat(paidAmount) || effectiveDueAmount;
  const changeAmount = Math.max(0, numPaid - effectiveDueAmount);

  // Filter medicines for autocomplete dropdown search
  const matchingMedicines = searchInputVal.trim().length >= 2
    ? medicines.filter((m) => {
        const query = searchInputVal.toLowerCase();
        return (
          m.tradeNameAr.toLowerCase().includes(query) ||
          m.tradeNameEn.toLowerCase().includes(query) ||
          m.activeIngredientEn.toLowerCase().includes(query) ||
          m.activeIngredientAr.toLowerCase().includes(query) ||
          m.barcode.includes(query) ||
          m.internalCode.toLowerCase().includes(query)
        );
      }).slice(0, 8)
    : [];

  // Card POS Tap Simulation
  const handleSimulateCardTap = () => {
    const auth = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
    setCardAuthCode(auth);
    setPaidAmount(effectiveDueAmount.toFixed(2));
    setIsCardTapSuccess(true);
    setTimeout(() => setIsCardTapSuccess(false), 3000);
  };

  // Main Checkout Handler
  const handleCheckout = () => {
    if (!currentShift || currentShift.status !== 'Open') {
      alert(
        isAr
          ? 'لا يمكن إتمام البيع: الشيفت الحالي مغلق! برجاء فتح شيفت جديد أولاً.'
          : 'Cannot complete sale: Current Shift is closed! Please open a shift first.'
      );
      return;
    }

    if (cart.length === 0) {
      alert(isAr ? 'السلة فارغة! برجاء إضافة أدوية أولاً.' : 'Cart is empty!');
      return;
    }

    // Clinical drug safety check
    const fatalConflicts = detectedConflicts.filter((c) => c.interaction.severity === 'Fatal');
    if (fatalConflicts.length > 0) {
      const proceed = confirm(
        isAr
          ? `تحذير سريري مميت (FATAL CONTRAINDICATION)!\nتم رصد تعارض خطير بين الأدوية في الفاتورة:\n${fatalConflicts[0].interaction.clinicalEffectAr}\n\nهل تؤكد كصيدلي مسؤول تجاوز التحذير وإتمام الصرف؟`
          : `FATAL DRUG INTERACTION DETECTED!\n${fatalConflicts[0].interaction.clinicalEffectEn}\n\nDo you take clinical responsibility to override?`
      );
      if (!proceed) return;
    }

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const invoiceTimestamp = now.toISOString();
    const zatcaQrData = generateZatcaTlvBase64(
      isAr ? settings.pharmacyNameAr : settings.pharmacyNameEn,
      settings.taxNumber,
      invoiceTimestamp,
      grandTotal.toFixed(2),
      '0.00'
    );

    const isInsurance = paymentMethod === 'Insurance';

    const newInvoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      dateTime: invoiceTimestamp,
      pharmacistName: currentUser?.nameAr || currentShift.pharmacistName,
      pharmacistId: currentUser?.id || currentShift.pharmacistId,
      shiftId: currentShift.id,
      customerName: customerName || (isInsurance ? (isAr ? 'مستفيد تأمين طبي' : 'Insurance Patient') : (isAr ? 'عميل نقدي' : 'Cash Customer')),
      paymentMethod,
      subTotal,
      taxAmount: 0,
      discountAmount: calculatedDiscount + (isInsurance ? contractDiscountAmount : 0),
      grandTotal,
      paidAmount: isInsurance ? patientCoPayAmount : (paymentMethod === 'Card' ? grandTotal : numPaid),
      changeAmount: isInsurance ? 0 : (paymentMethod === 'Card' ? 0 : changeAmount),
      items: cart.map((item, idx) => ({
        id: `inv-item-${idx}`,
        medicineId: item.medicine.id,
        tradeNameEn: item.medicine.tradeNameEn,
        tradeNameAr: item.medicine.tradeNameAr,
        batchNumber: item.selectedBatch.batchNumber,
        expiryDate: item.selectedBatch.expiryDate,
        unitType: item.unitType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: (item.unitPrice * item.quantity * item.discountPercent) / 100,
        lineTotal: item.lineTotal,
      })),
      qrCodeData: zatcaQrData,
      notes: cardAuthCode ? `تفويض بنكي: ${cardAuthCode}` : undefined,
      // Insurance & Contract fields
      insuranceContractId: isInsurance ? currentContract?.id : undefined,
      insuranceCompanyName: isInsurance ? (isAr ? currentContract?.nameAr : currentContract?.nameEn) : undefined,
      insuranceCardNumber: isInsurance ? insuranceCardNumber : undefined,
      insuranceApprovalNumber: isInsurance ? insuranceApprovalNumber : undefined,
      insuranceCoPayPercent: isInsurance ? insuranceCoPayPercent : undefined,
      patientCoPayAmount: isInsurance ? patientCoPayAmount : undefined,
      insuranceClaimAmount: isInsurance ? insuranceClaimAmount : undefined,
    };

    onInvoiceCreated(newInvoice);

    // If Insurance, create official claim record in the Claims Ledger
    if (isInsurance && currentContract) {
      const claimId = `clm-${Date.now()}`;
      const claimNumber = `CLM-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      const newClaim: InsuranceClaim = {
        id: claimId,
        claimNumber,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        contractId: currentContract.id,
        contractNameAr: currentContract.nameAr,
        contractNameEn: currentContract.nameEn,
        patientName: customerName || (isAr ? 'مريض تأمين' : 'Insurance Beneficiary'),
        cardNumber: insuranceCardNumber || (isAr ? 'غير محدد' : 'N/A'),
        approvalNumber: insuranceApprovalNumber || undefined,
        totalInvoiceAmount: grandTotal,
        discountAmount: contractDiscountAmount,
        patientPaidAmount: patientCoPayAmount,
        claimAmount: insuranceClaimAmount,
        status: 'Pending',
        createdAt: invoiceTimestamp,
        itemsCount: cart.length,
        notes: `تحمل ${insuranceCoPayPercent}% مسدد ${coPayPaymentMode === 'Cash' ? 'نقداً' : 'شبكة'}`,
      };

      onClaimCreated?.(newClaim);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // fallback
    }

    onOpenReceipt(newInvoice);

    // Reset Form
    setCart([]);
    setDiscountPercent(0);
    setPaidAmount('');
    setCustomerName('');
    setCardAuthCode('');
    setInsuranceCardNumber('');
    setInsuranceApprovalNumber('');
  };

  // Custom Electronic Payment checkout from Modal
  const handleCustomElectronicCheckout = (
    method: PaymentMethod,
    authRef: string,
    note?: string
  ) => {
    setPaymentMethod(method);
    setCardAuthCode(authRef);
    setTimeout(() => {
      handleCheckout();
    }, 100);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-3 sm:p-5 max-w-7xl mx-auto w-full">
      {/* 1. Closed Shift Alert Banner */}
      {(!currentShift || currentShift.status !== 'Open') && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                {isAr ? 'الشيفت الحالي مقفل (إصدار الفواتير معطل)' : 'Current Shift is Closed (Billing Disabled)'}
              </h4>
              <p className="text-[11px] opacity-90">
                {isAr
                  ? 'يجب فتح شيفت جديد أو تسليم الشيفت للبدء في إصدار فواتير البيع.'
                  : 'A shift must be opened before completing sales.'}
              </p>
            </div>
          </div>
          {onNavigateToShifts && (
            <button
              onClick={onNavigateToShifts}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              {isAr ? 'فتح أو تغيير الشيفت الآن ←' : 'Open / Change Shift →'}
            </button>
          )}
        </div>
      )}

      {/* 2. Full-Width Fast Barcode Scanner & Search Bar */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <Barcode className="w-5 h-5" />
          </div>

          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isAr ? 'امسح الباركود، أو اكتب اسم الدواء / المادة الفعالة للبحث الفوري (F1)...' : 'Scan barcode or type medicine name (F1)...'}
              value={searchInputVal}
              onChange={(e) => {
                setSearchInputVal(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchInputVal.trim()) {
                  if (matchingMedicines.length > 0) {
                    addToCart(matchingMedicines[0], 'Box');
                  } else {
                    handleBarcodeScanned(searchInputVal.trim());
                  }
                  setSearchInputVal('');
                  setShowSearchResults(false);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-600 font-mono shadow-inner"
            />

            {/* Instant Floating Autocomplete Dropdown */}
            {showSearchResults && matchingMedicines.length > 0 && (
              <div 
                ref={searchDropdownRef}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border-2 border-teal-600/40 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
              >
                {matchingMedicines.map((med) => {
                  const stock = calculateTotalStock(med);
                  const bestBatch = getFefoBatch(med, 'Box');
                  const expiryInfo = bestBatch ? getExpiryStatus(bestBatch.expiryDate) : null;

                  return (
                    <div
                      key={med.id}
                      onClick={() => addToCart(med, 'Box')}
                      className="p-3 hover:bg-teal-50/70 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                          <span>{isAr ? med.tradeNameAr : med.tradeNameEn}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({med.barcode})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isAr ? med.activeIngredientAr : med.activeIngredientEn}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            stock.totalBoxes > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isAr ? `${stock.totalBoxes} علبة` : `${stock.totalBoxes} boxes`}
                          </span>
                          {expiryInfo && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${expiryInfo.badgeColor}`}>
                              FEFO: {isAr ? expiryInfo.labelAr : expiryInfo.labelEn}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-teal-700 dark:text-teal-400 text-sm">
                          {med.pricePerBox.toFixed(2)} SAR
                        </div>
                        <button
                          type="button"
                          className="mt-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAr ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (searchInputVal.trim()) {
                if (matchingMedicines.length > 0) {
                  addToCart(matchingMedicines[0], 'Box');
                } else {
                  handleBarcodeScanned(searchInputVal.trim());
                }
                setSearchInputVal('');
                setShowSearchResults(false);
              }
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs shrink-0"
          >
            {isAr ? 'إضافة للسلة' : 'Add'}
          </button>
        </div>

        {/* Hotkeys Pills */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] text-teal-800 dark:text-teal-300 font-bold border border-slate-200 dark:border-slate-700">
            F1: {isAr ? 'بحث بالاسم/باركود' : 'Search'}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] text-teal-800 dark:text-teal-300 font-bold border border-slate-200 dark:border-slate-700">
            F4: {isAr ? 'علبة / شريط' : 'Box/Strip'}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] text-teal-800 dark:text-teal-300 font-bold border border-slate-200 dark:border-slate-700">
            F9: {isAr ? 'إنهاء وطباعة' : 'Checkout'}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] text-rose-700 dark:text-rose-300 font-bold border border-slate-200 dark:border-slate-700">
            ESC: {isAr ? 'إلغاء' : 'Clear'}
          </span>
        </div>
      </div>

      {/* 3. Real-time Drug Interactions Alert */}
      {detectedConflicts.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          {detectedConflicts.map((conflict, idx) => {
            const isFatal = conflict.interaction.severity === 'Fatal';
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 shadow-sm ${
                  isFatal
                    ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-950 dark:text-rose-100'
                    : 'bg-amber-50 dark:bg-amber-950/80 border-amber-400 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isFatal ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm">
                      {isAr ? 'تنبيه سريري لتداخل الأدوية:' : 'Clinical Drug Interaction Alert:'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isFatal ? 'bg-red-600 text-white border-red-700' : 'bg-orange-500 text-white border-orange-600'
                    }`}>
                      {conflict.interaction.severity}
                    </span>
                    <span className="font-bold underline">
                      {isAr ? conflict.cartItem1.medicine.tradeNameAr : conflict.cartItem1.medicine.tradeNameEn} ⇄{' '}
                      {isAr ? conflict.cartItem2.medicine.tradeNameAr : conflict.cartItem2.medicine.tradeNameEn}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed opacity-90">
                    {isAr ? conflict.interaction.clinicalEffectAr : conflict.interaction.clinicalEffectEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. FULL-WIDTH CART & INVOICE TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-black uppercase text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'أصناف الفاتورة الحالية' : 'Current Invoice Items'}</span>
            <span className="bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {cart.length} {isAr ? 'أصناف' : 'items'}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => {
                if (confirm(isAr ? 'هل أنت متأكد من تفريغ السلة؟' : 'Clear cart?')) {
                  setCart([]);
                }
              }}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'إفراغ الفاتورة' : 'Clear All'}</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 min-h-[160px] max-h-[380px] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="py-14 text-center text-slate-400 space-y-2">
              <Barcode className="w-12 h-12 mx-auto opacity-30 text-teal-600" />
              <p className="font-bold text-sm text-slate-500">
                {isAr ? 'السلة فارغة حالياً' : 'Cart is currently empty'}
              </p>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'امسح الباركود بجهاز القارئ، أو ابحث بالاسم في الشريط العلوي لإضافة الأصناف فوراً.'
                  : 'Scan barcode or type name in the search bar above to add items.'}
              </p>
            </div>
          ) : (
            cart.map((item, index) => {
              const expiryInfo = getExpiryStatus(item.selectedBatch.expiryDate);

              return (
                <div
                  key={`${item.medicine.id}-${item.unitType}-${item.selectedBatch.id}`}
                  onClick={() => setFocusedCartIndex(index)}
                  className={`p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 transition ${
                    focusedCartIndex === index
                      ? 'bg-teal-50/60 dark:bg-slate-800/70 border-r-4 rtl:border-r-0 rtl:border-l-4 border-teal-600'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Medicine Details */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                        {isAr ? item.medicine.tradeNameAr : item.medicine.tradeNameEn}
                      </span>
                      {item.medicine.requiresPrescription && (
                        <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                          Rx
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono flex-wrap">
                      <span>تشغيلة: {item.selectedBatch.batchNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${expiryInfo.badgeColor}`}>
                        صلاحية: {item.selectedBatch.expiryDate}
                      </span>
                    </div>
                  </div>

                  {/* Unit Switcher (Box / Strip) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleUnitType(index)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                      title={isAr ? 'التبديل بين علبة وشريط (F4)' : 'Toggle Box/Strip'}
                    >
                      <RefreshCw className="w-3 h-3 text-teal-600" />
                      <span>{item.unitType === 'Box' ? (isAr ? 'علبة كاملة' : 'Box') : (isAr ? 'شريط' : 'Strip')}</span>
                    </button>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Item Total & Delete */}
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono font-black text-teal-700 dark:text-teal-400 text-sm sm:text-base">
                        {item.lineTotal.toFixed(2)} SAR
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.quantity} × {item.unitPrice.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                      title={isAr ? 'حذف من الفاتورة' : 'Remove'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. COMPLETE ACTIVE PAYMENT & CHECKOUT CONTROL PANEL */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
          
          {/* Top Row: Payment Methods Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{isAr ? 'اختر طريقة الدفع (مفعلة وتفاعلية بالكامل):' : 'Active Payment Method:'}</span>
              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">
                {paymentMethod === 'Cash' ? (isAr ? 'دفع نقدي كاش' : 'Cash Tender') :
                 paymentMethod === 'Card' ? (isAr ? 'جهاز نقاط البيع ومدى' : 'Card POS') :
                 paymentMethod === 'Insurance' ? (isAr ? 'تأمين وتعاقدات طبية (Co-Pay)' : 'Corporate / Insurance') :
                 (isAr ? 'دفع إلكتروني فوري (QR / فوري)' : 'E-Payment / QR')}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'Cash', labelAr: 'كاش (نقدي)', labelEn: 'Cash', icon: Banknote, descAr: 'حساب النقدية والباقي' },
                { id: 'Card', labelAr: 'شبكة / مدى POS', labelEn: 'Card POS', icon: CreditCard, descAr: 'سحب فوري برقم تفويض' },
                { id: 'Insurance', labelAr: 'تأمين / تعاقدات', labelEn: 'Insurance / Co-Pay', icon: ShieldCheck, descAr: 'تحمل مريض ومطالبة شركة' },
                { id: 'OnlineElectronic', labelAr: 'إلكتروني (QR / فوري)', labelEn: 'QR / Fawry', icon: QrCode, descAr: 'محافظ وفوري وإنستاباي' },
              ].map((item) => {
                const isSelected = paymentMethod === item.id;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(item.id as PaymentMethod);
                      if (item.id === 'Card') {
                        setPaidAmount(effectiveDueAmount.toFixed(2));
                      }
                      if (item.id === 'OnlineElectronic' && cart.length > 0) {
                        setShowElectronicPayModal(true);
                      }
                    }}
                    className={`p-3 rounded-2xl font-bold text-xs transition cursor-pointer border flex flex-col items-center justify-center gap-1.5 text-center ${
                      isSelected
                        ? item.id === 'Insurance'
                          ? 'bg-emerald-700 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-teal-700 text-white border-teal-600 shadow-md ring-2 ring-teal-500/30'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                    <span className="font-black">{isAr ? item.labelAr : item.labelEn}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {item.descAr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC PAYMENT METHOD ACTIVE INTERACTIVE PANELS */}
          
          {/* A. If CASH: Show Tender Calculator & Quick Shortcuts */}
          {paymentMethod === 'Cash' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'المدفوع نقداً من العميل (لحساب الباقي):' : 'Cash Tendered:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder={grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-teal-600 rounded-xl px-4 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-xs text-slate-400 font-mono">
                      SAR
                    </span>
                  </div>
                </div>

                {/* Quick Tender Shortcuts */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isAr ? 'فئات النقدية السريعة:' : 'Quick Cash:'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: isAr ? 'المبلغ بالضبط' : 'Exact', value: grandTotal },
                      { label: '50', value: 50 },
                      { label: '100', value: 100 },
                      { label: '200', value: 200 },
                      { label: '500', value: 500 },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPaidAmount(btn.value.toFixed(2))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {changeAmount > 0 && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    {isAr ? '💵 الباقي المستحق للعميل:' : '💵 Change Due:'}
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-base">
                    {changeAmount.toFixed(2)} SAR
                  </span>
                </div>
              )}
            </div>
          )}

          {/* B. If CARD POS: Terminal NFC Simulation & Auth Code */}
          {paymentMethod === 'Card' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-500/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm flex items-center gap-2">
                      <span>{isAr ? 'جهاز نقاط البيع (POS Terminal) - مدى / فيزا' : 'Card Terminal (Mada / Visa)'}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online POS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {isAr ? 'المبلغ الإجمالي يُسحب مباشرة ببطاقة الصراف' : 'Full amount deducted from debit/credit card'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateCardTap}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Wifi className="w-4 h-4 text-amber-300" />
                  <span>{isAr ? 'سحب المبلغ بجهاز مدى (NFC Tap)' : 'Tap Card & Authorize'}</span>
                </button>
              </div>

              {cardAuthCode && (
                <div className="p-2.5 bg-white/10 rounded-xl flex items-center justify-between text-xs font-mono border border-white/15">
                  <span className="text-slate-300">{isAr ? 'رقم التفويض البنكي (Auth Code):' : 'Auth Code:'}</span>
                  <span className="font-bold text-amber-300">{cardAuthCode}</span>
                </div>
              )}
            </div>
          )}

          {/* C. If INSURANCE: Comprehensive Corporate Contract Panel */}
          {paymentMethod === 'Insurance' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-slate-900 border-2 border-emerald-600 shadow-md space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-3">
                <div className="flex items-center gap-2 font-black text-emerald-900 dark:text-emerald-100 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>{isAr ? 'بيانات وصرف التعاقد والتأمين الطبي' : 'Corporate Insurance & Co-Pay Scheme'}</span>
                </div>
                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full">
                  {isAr ? 'صرف تعاقد معتمد' : 'Approved Contract'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Select Partner / Company */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'شركة التأمين / جهة التعاقد:' : 'Insurance Partner:'}
                  </label>
                  <select
                    value={selectedContractId}
                    onChange={(e) => handleSelectContract(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {contracts.map((cnt) => (
                      <option key={cnt.id} value={cnt.id}>
                        {isAr ? cnt.nameAr : cnt.nameEn} ({cnt.defaultCoPayPercent}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Card / Member ID */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'رقم الكارنيه / بطاقة التأمين:' : 'Member Card #:'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BUP-8849-01"
                    value={insuranceCardNumber}
                    onChange={(e) => setInsuranceCardNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>

                {/* Medical Pre-Auth / Approval Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'رقم الموافقة الطبية (إن وُجد):' : 'Pre-Auth Approval #:'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. APV-99412"
                    value={insuranceApprovalNumber}
                    onChange={(e) => setInsuranceApprovalNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Co-Pay Breakdown Calculation Card */}
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'إجمالي الروشتة:' : 'Total Rx:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{grandTotal.toFixed(2)} SAR</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'نسبة التحمل المقررة:' : 'Co-Pay %:'}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={insuranceCoPayPercent}
                      onChange={(e) => setInsuranceCoPayPercent(parseFloat(e.target.value) || 0)}
                      className="w-14 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 font-mono font-black text-xs text-center"
                    />
                    <span className="font-bold font-mono">%</span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-black">
                    {isAr ? '💵 تحمل المريض (يسدد الآن):' : 'Patient Co-Pay Due:'}
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-base">
                    {patientCoPayAmount.toFixed(2)} SAR
                  </span>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/60 p-2 rounded-xl border border-teal-300 dark:border-teal-800">
                  <span className="text-[10px] text-teal-800 dark:text-teal-300 block font-black">
                    {isAr ? '🏢 مطالبة التأمين الآجلة:' : 'Insurance Claim:'}
                  </span>
                  <span className="font-mono font-black text-teal-700 dark:text-teal-300 text-base">
                    {insuranceClaimAmount.toFixed(2)} SAR
                  </span>
                </div>
              </div>

              {/* Co-Pay Payment Mode Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    {isAr ? 'طريقة تحصيل تحمل المريض:' : 'Patient Co-Pay Tender:'}
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setCoPayPaymentMode('Cash')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                        coPayPaymentMode === 'Cash' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isAr ? 'نقداً (كاش)' : 'Cash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoPayPaymentMode('Card')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                        coPayPaymentMode === 'Card' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isAr ? 'شبكة / بطاقة' : 'Card'}
                    </button>
                  </div>
                </div>

                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                  ✓ {isAr ? 'سيتم توليد مطالبة تأمين رسمية تلقائياً برقم مسلسل' : 'Official claim will be registered automatically'}
                </span>
              </div>
            </div>
          )}

          {/* D. If ONLINE ELECTRONIC: Trigger Modal or Quick Code */}
          {paymentMethod === 'OnlineElectronic' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900 to-indigo-950 text-white space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">
                      {isAr ? 'بوابة الدفع الإلكتروني السريع (QR / فوري / محافظ)' : 'Electronic Instant Checkout'}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {isAr ? 'مسح رمز الاستجابة السريع عبر محفظة العميل أو إصدار كود فوري' : 'Scan dynamic QR or issue Fawry reference code'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowElectronicPayModal(true)}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAr ? 'فتح نافذة الدفع الإلكتروني الشاملة' : 'Open E-Pay Channels'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Totals & Main Checkout F9 Button */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Customer Name & Discount % */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 block font-bold">
                  {isAr ? 'اسم العميل / المريض:' : 'Customer / Patient Name:'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'عميل نقدي / اسم المريض...' : 'Customer Name...'}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full sm:w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-500 block font-bold">
                    {isAr ? 'نسبة الخصم الإضافي %:' : 'Discount %:'}
                  </label>
                  {currentUser && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {canGiveDiscount ? `(الحد: ${maxAllowedDiscount}%)` : (isAr ? '🔒 محجوب للكاشير' : 'Locked')}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  max={maxAllowedDiscount}
                  disabled={!canGiveDiscount}
                  value={discountPercent}
                  onChange={(e) => {
                    const val = Math.min(maxAllowedDiscount, Math.max(0, parseFloat(e.target.value) || 0));
                    setDiscountPercent(val);
                  }}
                  placeholder={!canGiveDiscount ? (isAr ? 'غير مصرح' : 'Locked') : '0'}
                  className={`w-full sm:w-32 rounded-xl px-3 py-1.5 text-xs font-mono font-bold border transition ${
                    !canGiveDiscount
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="flex items-center gap-6 justify-between w-full lg:w-auto">
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {subTotal.toFixed(2)} SAR
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">
                  {paymentMethod === 'Insurance' ? (isAr ? 'تحمل المريض المطلوب:' : 'Patient Due:') : (isAr ? 'الصافي النهائي:' : 'Grand Total:')}
                </span>
                <span className="font-mono font-black text-xl text-teal-700 dark:text-teal-300">
                  {effectiveDueAmount.toFixed(2)} SAR
                </span>
              </div>
            </div>

            {/* Big Complete Checkout Button (F9) */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full lg:w-auto bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>{isAr ? 'إنهاء وحفظ وطباعة الفاتورة (F9)' : 'Checkout & Print Receipt (F9)'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Alternatives Modal (if cashier chooses an alternative from cart) */}
      {selectedAltSource && (
        <AlternativesModal
          sourceMedicine={selectedAltSource}
          allMedicines={medicines}
          isOpen={!!selectedAltSource}
          onClose={() => setSelectedAltSource(null)}
          onSelectAlternative={(altMed) => {
            addToCart(altMed, 'Box');
          }}
          lang={lang}
        />
      )}

      {/* Electronic Payment Modal for Sales Invoices */}
      <InvoiceElectronicPaymentModal
        isOpen={showElectronicPayModal}
        onClose={() => setShowElectronicPayModal(false)}
        grandTotal={effectiveDueAmount}
        invoiceTempNumber={`INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`}
        customerName={customerName}
        itemsCount={cart.length}
        onConfirmPayment={(method, authRef, note) => {
          handleCustomElectronicCheckout(method, authRef, note);
          setShowElectronicPayModal(false);
        }}
        lang={lang}
      />
    </div>
  );
};
