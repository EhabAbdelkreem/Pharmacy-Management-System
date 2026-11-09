import React, { useState, useRef, useEffect } from 'react';
import { 
  Medicine, 
  SalesInvoice, 
  Shift, 
  PharmacySettings, 
  SaaSTenantConfig, 
  PharmacistUser,
  StaffPermissions,
  BatchItem,
  DosageForm,
  PaymentGatewayConfig,
  SubscriptionTransaction,
  BillingCycle 
} from '../types/pharmacy';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';
import { LocalSqlServerManager } from './LocalSqlServerManager';
import { PRICING_PLANS, DEFAULT_PAYMENT_GATEWAYS_CONFIG, INITIAL_SUBSCRIPTION_TRANSACTIONS } from '../data/mockData';
import { apiClient } from '../services/apiClient';
import { calculateTotalStock, getExpiryStatus } from '../services/fefoEngine';
import { getPharmacyClientUrl, copyTextSafely } from '../services/appUrlHelper';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Cloud, 
  ShieldCheck, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Percent, 
  Sliders, 
  Server, 
  Database, 
  CheckCircle2, 
  Activity, 
  PlusCircle, 
  Building2, 
  Edit3, 
  Lock, 
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Layers,
  Download,
  Upload,
  CreditCard,
  Building,
  Calendar,
  Clock,
  ArrowDownRight,
  Send,
  FileSpreadsheet,
  KeyRound,
  ShieldAlert,
  UserCheck,
  FileCheck2
} from 'lucide-react';

interface OwnerControlPanelProps {
  medicines: Medicine[];
  invoices: SalesInvoice[];
  shifts: Shift[];
  settings: PharmacySettings;
  tenantConfig: SaaSTenantConfig;
  pharmacists: PharmacistUser[];
  onUpdateMedicinePrice: (medicineId: string, newPriceBox: number, newPriceStrip: number) => void;
  onAddNewMedicine: (medicine: Medicine) => void;
  onUpdateTenantConfig: (updatedConfig: Partial<SaaSTenantConfig>) => void;
  onUpdatePharmacist: (pharmacistId: string, updates: Partial<PharmacistUser>) => void;
  onAddPharmacist: (newPharmacist: PharmacistUser) => void;
  lang: 'ar' | 'en';
}

interface OperatingExpense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

interface CustomerCreditAccount {
  id: string;
  name: string;
  phone: string;
  conditionNotes: string;
  balanceDue: number;
  lastPaymentDate: string;
}

interface SupplierAccount {
  id: string;
  name: string;
  representativeName: string;
  phone: string;
  balanceOwed: number;
  deliveryDays: string;
}

export const OwnerControlPanel: React.FC<OwnerControlPanelProps> = ({
  medicines,
  invoices,
  shifts,
  settings,
  tenantConfig,
  pharmacists,
  onUpdateMedicinePrice,
  onAddNewMedicine,
  onUpdateTenantConfig,
  onUpdatePharmacist,
  onAddPharmacist,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Sub-tabs: 'overview' | 'inventory' | 'expenses-credit' | 'suppliers' | 'staff' | 'saas-cloud' | 'subscription-billing' | 'sqlserver-hybrid'
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'expenses-credit' | 'suppliers' | 'staff' | 'saas-cloud' | 'subscription-billing' | 'sqlserver-hybrid'>('overview');

  // Subscription Billing & Payment Gateways state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<BillingCycle>('Annual');
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAYS_CONFIG);
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>(INITIAL_SUBSCRIPTION_TRANSACTIONS);
  const [isSavingGateways, setIsSavingGateways] = useState(false);
  const [gatewaySaveSuccess, setGatewaySaveSuccess] = useState(false);

  useEffect(() => {
    apiClient.getGatewayConfig().then((cfg) => {
      if (cfg) setGatewayConfig(cfg);
    }).catch(console.error);

    apiClient.getTransactions().then((txs) => {
      if (txs && txs.length > 0) setTransactions(txs);
    }).catch(console.error);
  }, []);

  // Branch Selector
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'branch-1' | 'branch-2'>('all');

  // Operating Expenses state
  const [expenses, setExpenses] = useState<OperatingExpense[]>([
    { id: 'exp-1', category: 'إيجار مقر الصيدلية', amount: 4500, date: '2026-11-01', notes: 'دفعة إيجار شهر نوفمبر' },
    { id: 'exp-2', category: 'فاتورة الكهرباء والتكييف', amount: 680, date: '2026-11-01', notes: 'ثلاجات الأنسولين والتكييف المركزي' },
    { id: 'exp-3', category: 'رواتب الصيادلة المساعدين', amount: 8500, date: '2026-11-01', notes: 'رواتب 2 صيدلي مناوب' },
    { id: 'exp-4', category: 'استضافة سحابية واشتراك ZATCA', amount: 250, date: '2026-11-01', notes: 'بنية تحتية سحابية' },
  ]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpCategory, setNewExpCategory] = useState('مصروفات نثرية وصيانة');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Customer Credit Accounts state (ديون العملاء / الآجل)
  const [customerCredits, setCustomerCredits] = useState<CustomerCreditAccount[]>([
    { id: 'c-1', name: 'أبو فهد القحطاني', phone: '0501234567', conditionNotes: 'مريض سكري وضغط (أنسولين ومسكنات)', balanceDue: 340.00, lastPaymentDate: '2026-10-25' },
    { id: 'c-2', name: 'أم عبد الله الحربي', phone: '0559876543', conditionNotes: 'حليب أطفال وأدوية حساسية شهرية', balanceDue: 185.50, lastPaymentDate: '2026-10-28' },
    { id: 'c-3', name: 'م. سلطان الغامدي', phone: '0543218765', conditionNotes: 'فيتامينات ومكملات طبية دورية', balanceDue: 490.00, lastPaymentDate: '2026-10-20' },
  ]);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustBalance, setNewCustBalance] = useState('');

  // Suppliers Directory state
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>([
    { id: 'sup-1', name: 'الشركة المتحدة للصيادلة (UCP)', representativeName: 'أ. طارق عبد الرحمن', phone: '+966 50 111 2233', balanceOwed: 14200.00, deliveryDays: 'السبت، الثلاثاء' },
    { id: 'sup-2', name: 'فارما أوفرسيز (Pharma Overseas)', representativeName: 'د. محمود صبري', phone: '+966 55 444 5566', balanceOwed: 9850.00, deliveryDays: 'الأحد، الأربعاء' },
    { id: 'sup-3', name: 'شركة سقالة للرعاية الصحية (Cigalah)', representativeName: 'أ. وليد الشهري', phone: '+966 54 777 8899', balanceOwed: 5400.00, deliveryDays: 'الإثنين، الخميس' },
    { id: 'sup-4', name: 'ابن سينا للخدمات الطبية (Ibn Sina)', representativeName: 'أ. هاني التميمي', phone: '+966 56 123 9874', balanceOwed: 3600.00, deliveryDays: 'يومياً عند الطلب' },
  ]);

  // SaaS Calculator Simulator State
  const [simulatedPharmaciesCount, setSimulatedPharmaciesCount] = useState<number>(20);
  const [subscriptionPricePerYear, setSubscriptionPricePerYear] = useState<number>(2500);

  // Modals & form state
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showEditPriceModal, setShowEditPriceModal] = useState<Medicine | null>(null);
  const [editingPriceBox, setEditingPriceBox] = useState<string>('');
  const [editingPriceStrip, setEditingPriceStrip] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Client link generator state
  const [clientPharmacyName, setClientPharmacyName] = useState('صيدليات الشفاء الحديثة');
  const [clientSubdomain, setClientSubdomain] = useState('al-shifa');
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Professional' | 'Enterprise'>('Enterprise');
  const [generatedClientUrl, setGeneratedClientUrl] = useState('https://al-shifa.pharmacore.cloud');

  // Staff Permissions Management State
  const [editingPharmacist, setEditingPharmacist] = useState<PharmacistUser | null>(null);
  const [editingPerms, setEditingPerms] = useState<StaffPermissions | null>(null);
  const [editingPin, setEditingPin] = useState<string>('');

  // New Pharmacist Form State
  const [showAddPharmacistModal, setShowAddPharmacistModal] = useState(false);
  const [newPharmName, setNewPharmName] = useState('');
  const [newPharmUsername, setNewPharmUsername] = useState('');
  const [newPharmPin, setNewPharmPin] = useState('1234');
  const [newPharmRole, setNewPharmRole] = useState<'Admin' | 'ShiftSupervisor' | 'Pharmacist' | 'Cashier'>('Pharmacist');
  const [newPharmLicense, setNewPharmLicense] = useState('');
  const [newPharmPhone, setNewPharmPhone] = useState('');
  const [newPharmPerms, setNewPharmPerms] = useState<StaffPermissions>({
    canAccessOwnerPanel: false,
    canViewProfitsAndCost: false,
    canEditPrices: false,
    canCloseDayZReport: false,
    canManageInventory: true,
    canManageStaff: false,
    canVoidInvoices: false,
    canGiveDiscount: true,
    maxDiscountPercent: 10,
    canManageDebts: true,
  });

  // New Medicine Form State
  const [newMedTradeAr, setNewMedTradeAr] = useState('');
  const [newMedTradeEn, setNewMedTradeEn] = useState('');
  const [newMedActiveEn, setNewMedActiveEn] = useState('');
  const [newMedBarcode, setNewMedBarcode] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('مسكنات وخافضات حرارة');
  const [newMedDosage, setNewMedDosage] = useState<DosageForm>('Tablets');
  const [newMedUnitsPerBox, setNewMedUnitsPerBox] = useState('2');
  const [newMedPriceBox, setNewMedPriceBox] = useState('');
  const [newMedCostPrice, setNewMedCostPrice] = useState('');
  const [newMedReorderLevel, setNewMedReorderLevel] = useState('10');
  const [newMedInitialQty, setNewMedInitialQty] = useState('25');
  const [newMedExpiryDate, setNewMedExpiryDate] = useState('2027-12-31');

  // Inventory search
  const [inventorySearch, setInventorySearch] = useState('');

  // -------------------------------------------------------------
  // Comprehensive Financial Calculations
  // -------------------------------------------------------------
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalInvoicesCount = invoices.length;
  const avgBasketSize = totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0;

  // Approximate COGS (Cost of goods sold) & Gross Profit
  let totalCostOfSoldGoods = 0;
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const med = medicines.find((m) => m.id === item.medicineId);
      if (med) {
        const batch = med.batches.find((b) => b.batchNumber === item.batchNumber) || med.batches[0];
        const costPerBox = batch ? batch.costPrice : med.pricePerBox * 0.65;
        const itemCost = item.unitType === 'Box' ? costPerBox * item.quantity : (costPerBox / med.unitsPerBox) * item.quantity;
        totalCostOfSoldGoods += itemCost;
      }
    });
  });

  const estimatedGrossProfit = Math.max(0, totalRevenue - totalCostOfSoldGoods);
  const profitMarginPercent = totalRevenue > 0 ? (estimatedGrossProfit / totalRevenue) * 100 : 34.2;

  // Operating Expenses Total & Bottom Line
  const totalOperatingExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalCustomerReceivables = customerCredits.reduce((acc, c) => acc + c.balanceDue, 0);
  const totalSupplierPayables = suppliers.reduce((acc, s) => acc + s.balanceOwed, 0);

  // Current Warehouse Valuation (Cost vs Retail)
  let totalStockCostValue = 0;
  let totalStockRetailValue = 0;
  medicines.forEach((med) => {
    med.batches.forEach((b) => {
      const totalBoxEquivalent = b.quantityBoxesAvailable + b.quantityStripsAvailable / med.unitsPerBox;
      totalStockCostValue += totalBoxEquivalent * b.costPrice;
      totalStockRetailValue += totalBoxEquivalent * b.sellingPriceBox;
    });
  });
  const unrealizedInventoryProfit = totalStockRetailValue - totalStockCostValue;

  // Low Stock Items
  const lowStockMedicines = medicines.filter((m) => calculateTotalStock(m).totalBoxes <= m.reorderLevel);

  // Near Expiry Items
  const nearExpiryBatches: { med: Medicine; batch: BatchItem; days: number }[] = [];
  medicines.forEach((med) => {
    med.batches.forEach((b) => {
      const expStatus = getExpiryStatus(b.expiryDate);
      if (expStatus.daysRemaining <= 90 && expStatus.daysRemaining > 0) {
        nearExpiryBatches.push({ med, batch: b, days: expStatus.daysRemaining });
      }
    });
  });

  // Handle Edit Price
  const handleSavePriceEdit = () => {
    if (!showEditPriceModal) return;
    const pBox = parseFloat(editingPriceBox);
    const pStrip = parseFloat(editingPriceStrip) || pBox / showEditPriceModal.unitsPerBox;
    if (isNaN(pBox) || pBox <= 0) {
      alert(isAr ? 'برجاء إدخال سعر بيع صحيح' : 'Invalid price');
      return;
    }
    onUpdateMedicinePrice(showEditPriceModal.id, pBox, pStrip);
    setShowEditPriceModal(null);
  };

  // Handle Add Medicine
  const handleSaveNewMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    const priceBox = parseFloat(newMedPriceBox);
    const costPrice = parseFloat(newMedCostPrice) || priceBox * 0.7;
    const unitsPerBox = parseInt(newMedUnitsPerBox) || 2;
    const initialBoxes = parseInt(newMedInitialQty) || 20;

    if (!newMedTradeAr || !newMedTradeEn || isNaN(priceBox)) {
      alert(isAr ? 'برجاء تعبئة الحقول الأساسية' : 'Please fill required fields');
      return;
    }

    const medId = `med-cust-${Date.now()}`;
    const newMed: Medicine = {
      id: medId,
      tradeNameAr: newMedTradeAr,
      tradeNameEn: newMedTradeEn,
      activeIngredientAr: newMedTradeAr,
      activeIngredientEn: newMedActiveEn || newMedTradeEn,
      barcode: newMedBarcode || `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      internalCode: `INT-${Math.floor(100 + Math.random() * 900)}`,
      categoryAr: newMedCategory,
      categoryEn: 'General Medicines',
      dosageForm: newMedDosage,
      reorderLevel: parseInt(newMedReorderLevel) || 10,
      requiresPrescription: false,
      unitsPerBox,
      pricePerBox: priceBox,
      pricePerStrip: parseFloat((priceBox / unitsPerBox).toFixed(2)),
      batches: [
        {
          id: `bch-${Date.now()}`,
          batchNumber: `BCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          manufactureDate: new Date().toISOString().split('T')[0],
          expiryDate: newMedExpiryDate || '2027-12-31',
          costPrice,
          sellingPriceBox: priceBox,
          sellingPriceStrip: parseFloat((priceBox / unitsPerBox).toFixed(2)),
          quantityBoxesAvailable: initialBoxes,
          quantityStripsAvailable: 0,
          shelfLocation: 'A-New',
          medicineId: medId,
        },
      ],
    };

    onAddNewMedicine(newMed);
    setShowAddMedModal(false);
    setNewMedTradeAr('');
    setNewMedTradeEn('');
    setNewMedPriceBox('');
    setNewMedCostPrice('');
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpAmount);
    if (isNaN(amt) || amt <= 0) return;
    setExpenses((prev) => [
      {
        id: `exp-${Date.now()}`,
        category: newExpCategory,
        amount: amt,
        date: new Date().toISOString().split('T')[0],
        notes: newExpNotes || (isAr ? 'مصروف معتمد من الإدارة' : 'Approved expense'),
      },
      ...prev,
    ]);
    setShowAddExpenseModal(false);
    setNewExpAmount('');
    setNewExpNotes('');
  };

  // Add Customer Credit
  const handleAddCustomerCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setCustomerCredits((prev) => [
      {
        id: `c-${Date.now()}`,
        name: newCustName,
        phone: newCustPhone || '0500000000',
        conditionNotes: newCustNotes || (isAr ? 'عميل دائم' : 'Regular client'),
        balanceDue: parseFloat(newCustBalance) || 0,
        lastPaymentDate: new Date().toISOString().split('T')[0],
      },
      ...prev,
    ]);
    setShowAddCreditModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustBalance('');
    setNewCustNotes('');
  };

  // Record payment from credit customer
  const handleRecordCustomerPayment = (customerId: string, amount: number) => {
    setCustomerCredits((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              balanceDue: Math.max(0, c.balanceDue - amount),
              lastPaymentDate: new Date().toISOString().split('T')[0],
            }
          : c
      )
    );
  };

  // Copy URL to clipboard safely
  const handleCopyLink = async () => {
    const slug = clientSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'client';
    const finalUrl = getPharmacyClientUrl(slug);
    const ok = await copyTextSafely(finalUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Save Pharmacist Permissions Edit
  const handleSavePermissions = () => {
    if (!editingPharmacist || !editingPerms) return;
    onUpdatePharmacist(editingPharmacist.id, {
      permissions: editingPerms,
      pin: editingPin || editingPharmacist.pin,
    });
    setEditingPharmacist(null);
    setEditingPerms(null);
  };

  // Filtered medicines for inventory table
  const filteredMedicines = medicines.filter(
    (m) =>
      m.tradeNameAr.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.tradeNameEn.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.barcode.includes(inventorySearch)
  );

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE COMMAND HEADER                          */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? 'كنترول بانال صاحب الصيدلية والإدارة العامة' : 'Pharmacy Owner Control Center'}
              </span>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-bold px-3 py-1 rounded-full font-mono">
                {tenantConfig.tenantId}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-3 py-1 rounded-full">
                {tenantConfig.subscriptionPlan} Tier
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {tenantConfig.tenantName}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'لوحة القيادة التنفيذية الشاملة لكافة أقسام الصيدلية: صافي الأرباح اللحظية، تقييم المخزون، استيراد وتصدير إكسيل الأدوية، إدارة الموظفين والصلاحيات، ديون العملاء، وتوليد روابط البيع السحابية للعملاء.'
                : 'Executive control suite for real-time net profits, inventory valuation, excel catalog import/export, staff permissions RBAC, and cloud SaaS client link provisioning.'}
            </p>
          </div>

          {/* Branch Switcher & Quick Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col gap-3 min-w-[280px]">
            <div>
              <span className="text-[11px] text-slate-300 block font-semibold mb-1">
                {isAr ? 'عرض بيانات الفرع:' : 'Select Branch View:'}
              </span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as any)}
                className="w-full bg-slate-900/90 text-white border border-teal-500/40 rounded-xl p-2 text-xs font-semibold focus:outline-none"
              >
                <option value="all">{isAr ? '🏢 كافة الفروع مجمعة (All Branches)' : 'All Branches (Consolidated)'}</option>
                <option value="branch-1">{isAr ? '📍 الفرع 1 - طريق الملك فهد (الرئيسي)' : 'Branch 1 - Main Center'}</option>
                <option value="branch-2">{isAr ? '📍 الفرع 2 - مجمع النخبة (العليا)' : 'Branch 2 - Olaya Plaza'}</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
              <span className="text-slate-300">{isAr ? 'حالة السحابة المركزية:' : 'Cloud Database:'}</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {tenantConfig.cloudSyncStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-NAVIGATION TABS (شامل لكل شى فى الصيدلية)           */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? 'الأرباح والمبيعات' : 'Profits & Sales'}</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isAr ? 'المخزون وتسعير الأدوية' : 'Stock & Pricing'}</span>
            {lowStockMedicines.length > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                {lowStockMedicines.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'staff'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'إدارة الموظفين والصلاحيات' : 'Staff & Permissions'}</span>
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
              RBAC
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expenses-credit')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'expenses-credit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{isAr ? 'المصروفات وديون العملاء' : 'Expenses & Credit'}</span>
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
              {customerCredits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'suppliers'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isAr ? 'الموردين والشركات' : 'Suppliers'}</span>
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('saas-cloud')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'saas-cloud'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-teal-500" />
            <span>{isAr ? 'بيع النظام سحابياً برابط (SaaS Engine)' : 'Cloud SaaS Engine'}</span>
            <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
              PRO
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subscription-billing')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'subscription-billing'
                ? 'bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'إعدادات الاشتراك وبوابات الدفع (Stripe / Fawry / Cash)' : 'Subscription & Payment Gateways'}</span>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-amber-400/30">
              بوابات الدفع
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sqlserver-hybrid')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'sqlserver-hybrid'
                ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'ربط SQL Server محلي وسحابي (Hybrid)' : 'Local SQL Server Sync'}</span>
            <span className="bg-cyan-400/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-cyan-400/30">
              T-SQL
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: FINANCIALS & PROFIT OVERVIEW                      */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-bold">{isAr ? 'إجمالي المبيعات المحققة:' : 'Gross Sales:'}</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-mono font-black text-2xl text-slate-900 dark:text-white">
                {totalRevenue.toFixed(2)} <span className="text-xs font-sans text-slate-500 font-normal">SAR</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{invoices.length} {isAr ? 'فاتورة مكتملة بالكامل' : 'completed invoices'}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-bold">{isAr ? 'صافي الربح الإجمالي:' : 'Net Gross Profit:'}</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="font-mono font-black text-2xl text-teal-700 dark:text-teal-400">
                {estimatedGrossProfit.toFixed(2)} <span className="text-xs font-sans text-slate-500 font-normal">SAR</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {isAr ? 'هامش الربح التشغيلي:' : 'Profit Margin:'} <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">{profitMarginPercent.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-bold">{isAr ? 'تقييم المخزون (بسعر البيع):' : 'Stock Retail Valuation:'}</span>
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div className="font-mono font-black text-2xl text-purple-700 dark:text-purple-400">
                {totalStockRetailValue.toFixed(2)} <span className="text-xs font-sans text-slate-500 font-normal">SAR</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {isAr ? 'سعر التكلفة للمخزون:' : 'At Cost Price:'} <span className="font-mono">{totalStockCostValue.toFixed(0)} SAR</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-bold">{isAr ? 'أرباح كامنة بالمخزون:' : 'Unrealized Margin:'}</span>
                <Percent className="w-4 h-4 text-amber-600" />
              </div>
              <div className="font-mono font-black text-2xl text-emerald-700 dark:text-emerald-400">
                +{unrealizedInventoryProfit.toFixed(0)} <span className="text-xs font-sans text-slate-500 font-normal">SAR</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {isAr ? 'متوسط الفاتورة:' : 'Avg Basket:'} <span className="font-mono font-bold text-slate-900 dark:text-white">{avgBasketSize.toFixed(1)} SAR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INVENTORY & EXCEL CATALOG (رابعاً: إكسيل الأدوية) */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Action Bar with Excel Buttons */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={isAr ? 'ابحث في قائمة الأدوية للتسعير أو المراقبة...' : 'Search medicine catalog...'}
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowPOModal(true)}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isAr ? 'أمر شراء للموردين' : 'Supplier PO'}</span>
              </button>

              <button
                onClick={() => setShowAddMedModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAr ? 'إضافة دواء جديد' : 'Add Medicine'}</span>
              </button>
            </div>
          </div>

          {/* Medicines Master Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'الدواء' : 'Medicine'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الباركود' : 'Barcode'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الرصيد الكلي' : 'Total Stock'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'سعر التكلفة' : 'Cost Price'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'سعر البيع (علبة)' : 'Retail (Box)'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'هامش الربح' : 'Margin %'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMedicines.map((m) => {
                    const stock = calculateTotalStock(m);
                    const avgCost = m.batches[0]?.costPrice || m.pricePerBox * 0.7;
                    const margin = m.pricePerBox > 0 ? ((m.pricePerBox - avgCost) / m.pricePerBox) * 100 : 0;
                    const isLow = stock.totalBoxes <= m.reorderLevel;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {isAr ? m.tradeNameAr : m.tradeNameEn}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {m.activeIngredientEn}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {m.barcode}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isLow
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {stock.totalBoxes} {isAr ? 'علبة' : 'boxes'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {avgCost.toFixed(2)} SAR
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {m.pricePerBox.toFixed(2)} SAR
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                          {margin.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setShowEditPriceModal(m);
                              setEditingPriceBox(m.pricePerBox.toString());
                              setEditingPriceStrip(m.pricePerStrip.toString());
                            }}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>{isAr ? 'تعديل السعر' : 'Edit Price'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STAFF & GRANULAR PERMISSIONS (أولاً وثالثاً)       */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isAr ? 'إدارة الموظفين والتحكم الدقيق بالصلاحيات (Staff RBAC)' : 'Staff Management & Permissions'}
                </h3>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  {isAr ? 'حماية صلاحيات المدير مفعلة' : 'Admin Protected'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'تخصيص صلاحيات كل صيدلي أو كاشير بدقة: منع ظهور لوحة المالك، حجب التكلفة والأرباح، تقييد تعديل الأسعار، وتحديد سقف الخصم.'
                  : 'Configure role-based access control per staff member: hide owner panel, mask costs, restrict price editing and set discount ceilings.'}
              </p>
            </div>

            <button
              onClick={() => setShowAddPharmacistModal(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAr ? 'إضافة موظف جديد وتعيين صلاحياته' : 'Add Staff Member'}</span>
            </button>
          </div>

          {/* Pharmacist Cards with Permissions Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pharmacists.map((pharm) => {
              const isAdmin = pharm.role === 'Admin';
              const p = pharm.permissions;

              return (
                <div
                  key={pharm.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{isAdmin ? '👑' : '💊'}</span>
                        <span>{pharm.nameAr}</span>
                      </h4>
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono font-bold block mt-0.5">
                        {pharm.licenseNumber} • رمز PIN: {pharm.pin}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isAdmin
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                      }`}
                    >
                      {pharm.role}
                    </span>
                  </div>

                  {/* Permissions Checklist Indicators */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {isAr ? 'الصلاحيات الممنوحة للموظف:' : 'Active Permissions:'}
                    </span>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{isAr ? 'دخول لوحة المالك والـ SaaS:' : 'Owner Panel:'}</span>
                      <span className={`font-bold ${p.canAccessOwnerPanel ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {p.canAccessOwnerPanel ? (isAr ? '✓ مسموح' : 'Yes') : (isAr ? '✕ محجوب تماماً' : 'Blocked')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{isAr ? 'رؤية أسعار التكلفة والأرباح:' : 'View Cost/Profit:'}</span>
                      <span className={`font-bold ${p.canViewProfitsAndCost ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {p.canViewProfitsAndCost ? (isAr ? '✓ ظاهر' : 'Yes') : (isAr ? '✕ مخفي' : 'Hidden')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{isAr ? 'تعديل أسعار بيع الأدوية:' : 'Edit Prices:'}</span>
                      <span className={`font-bold ${p.canEditPrices ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {p.canEditPrices ? (isAr ? '✓ متاح' : 'Yes') : (isAr ? '✕ معطل' : 'Disabled')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{isAr ? 'سقف الخصم المسموح:' : 'Max Discount:'}</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                        {p.maxDiscountPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Financial Discrepancies and Sales */}
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'المبيعات:' : 'Sales:'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{pharm.totalSalesGenerated.toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'فارق الخزينة:' : 'Discrepancy:'}</span>
                      <span className={`font-mono font-bold ${pharm.totalDiscrepancy === 0 ? 'text-emerald-600' : pharm.totalDiscrepancy > 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        {pharm.totalDiscrepancy > 0 ? '+' : ''}{pharm.totalDiscrepancy.toFixed(2)} SAR
                      </span>
                    </div>
                  </div>

                  {/* Edit Permissions Action Button */}
                  <button
                    onClick={() => {
                      setEditingPharmacist(pharm);
                      setEditingPerms({ ...pharm.permissions });
                      setEditingPin(pharm.pin);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isAr ? 'تعديل الصلاحيات ورمز المرور' : 'Edit Permissions & PIN'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: EXPENSES & CUSTOMER CREDIT LEDGER                 */}
      {/* ======================================================== */}
      {activeTab === 'expenses-credit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-rose-600" />
                    <span>{isAr ? 'المصروفات التشغيلية والنثرية' : 'Operating Expenses'}</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {isAr ? 'إجمالي المصروفات: ' : 'Total: '} {totalOperatingExpenses.toFixed(2)} SAR
                  </span>
                </div>

                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة مصروف' : 'Add Expense'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {expenses.map((exp) => (
                  <div key={exp.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{exp.category}</div>
                      <div className="text-[10px] text-slate-500">{exp.notes} • {exp.date}</div>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      -{exp.amount.toFixed(2)} SAR
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>{isAr ? 'دفتر ديون العملاء والبيع الآجل' : 'Customer Credit Ledger'}</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {isAr ? 'إجمالي المستحقات: ' : 'Total Due: '} {totalCustomerReceivables.toFixed(2)} SAR
                  </span>
                </div>

                <button
                  onClick={() => setShowAddCreditModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة عميل آجل' : 'Add Customer'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {customerCredits.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">{c.phone}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{c.conditionNotes}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {c.balanceDue.toFixed(2)} SAR
                      </span>
                      <button
                        onClick={() => {
                          const p = prompt(isAr ? 'أدخل المبلغ المسدد (ريال):' : 'Payment amount:', '50');
                          if (p && !isNaN(parseFloat(p))) {
                            handleRecordCustomerPayment(c.id, parseFloat(p));
                          }
                        }}
                        className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-teal-100 cursor-pointer"
                      >
                        {isAr ? 'سداد دفعة' : 'Pay'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SUPPLIERS DIRECTORY                               */}
      {/* ======================================================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {isAr ? 'دليل شركات وموردي الأدوية والمديونيات' : 'Suppliers & Distribution Accounts'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'متابعة الشركات الموردة للأدوية، مواعيد التوريد الدورية، وأرصدة المديونيات المستحقة.'
                  : 'Track pharmaceutical distributors, delivery schedules, and accounts payable.'}
              </p>
            </div>

            <button
              onClick={() => setShowPOModal(true)}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{isAr ? 'إصدار أمر توريد للموزعين' : 'Issue Purchase Order'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{s.name}</h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.representativeName} • {s.phone}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'المديونية الحالية:' : 'Balance Owed:'}</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{s.balanceOwed.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'أيام التوريد:' : 'Schedule:'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.deliveryDays}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: CLOUD SAAS ENGINE                                 */}
      {/* ======================================================== */}
      {activeTab === 'saas-cloud' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-teal-800/50 space-y-4">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>{isAr ? 'محرك السحابة: بيع البرنامج كخدمة (Multi-Tenant SaaS)' : 'Cloud SaaS Architecture'}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white">
              {isAr
                ? 'نموذج البيع برابط مخصص: كل صيدلية تشترك معك تعمل بقاعدة بيانات سحابية معزولة فوراً.'
                : 'Dedicated URL & Isolated Cloud Database for each client pharmacy.'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Database className="w-4 h-4" />
                  <span>{isAr ? '1. قاعدة Cloud SQL مركزية' : '1. Central Cloud SQL'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'قاعدة بيانات PostgreSQL عالية الأداء ومؤمنة سحابياً برمجت عبر Drizzle ORM.'
                    : 'High-availability Cloud SQL PostgreSQL database with Drizzle ORM.'}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
                  <LinkIcon className="w-4 h-4" />
                  <span>{isAr ? '2. رابط خاص لكل صيدلية' : '2. Dedicated Subdomain'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'العميل يفتح الرابط الخاص به ويعمل مباشرة بدون تثبيت أي سيرفرات أو ملفات.'
                    : 'Client opens custom URL on any PC or tablet without installing desktop software.'}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAr ? '3. بيع دون إنترنت (Offline POS)' : '3. Offline-First POS'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'لو انقطع الإنترنت، الكاشير يبيع ويطبع الفواتير بدون توقف مع مزامنة تلقائية فور عودة النت.'
                    : 'Full offline selling with IndexedDB storage and auto-sync when network reconnects.'}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                  <Activity className="w-4 h-4" />
                  <span>{isAr ? '4. اشتراكات متجددة سنوية' : '4. SaaS Subscriptions'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'دخل متكرر سنوي مع إمكانية إيقاف أو تجديد التراخيص بضغطة زر.'
                    : 'Manage annual subscriptions, renewals, branch limits, and remote activation.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-teal-600" />
              <span>{isAr ? 'توليد رابط العميل الفوري' : 'Client Link Generator'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold text-xs mb-1">
                  {isAr ? 'اسم صيدلية العميل:' : 'Client Pharmacy Name:'}
                </label>
                <input
                  type="text"
                  value={clientPharmacyName}
                  onChange={(e) => setClientPharmacyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold text-xs mb-1">
                  {isAr ? 'الاسم المعرف في الرابط (Subdomain):' : 'Client Subdomain Slug:'}
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5">
                  <input
                    type="text"
                    value={clientSubdomain}
                    onChange={(e) => setClientSubdomain(e.target.value)}
                    className="w-full bg-transparent p-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">.pharmacore.cloud</span>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold text-xs mb-1">
                  {isAr ? 'باقة الاشتراك والترخيص:' : 'Subscription Plan:'}
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="Starter">Starter (فرع واحد - 1 Branch)</option>
                  <option value="Professional">Professional (3 فروع - 3 Branches)</option>
                  <option value="Enterprise">Enterprise (غير محدود - Unlimited Branches)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                  {isAr ? 'رابط العميل المباشر للبيع والتشغيل (صالح لجميع الهواتف):' : 'Ready Client Link (Mobile-Ready):'}
                </span>
                <a
                  href={getPharmacyClientUrl(clientSubdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-black text-xs sm:text-sm text-teal-800 dark:text-teal-300 hover:underline block"
                  dir="ltr"
                >
                  {getPharmacyClientUrl(clientSubdomain)}
                </a>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={getPharmacyClientUrl(clientSubdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isAr ? 'فتح الرابط' : 'Open Link'}</span>
                </a>

                <button
                  onClick={handleCopyLink}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? (isAr ? 'تم نسخ الرابط!' : 'Copied!') : (isAr ? 'نسخ الرابط لإرساله للعميل' : 'Copy Client Link')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: SUBSCRIPTION SETTINGS & PAYMENT GATEWAYS (STRIPE / FAWRY / CASH) */}
      {/* ======================================================== */}
      {activeTab === 'subscription-billing' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-500/30 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'إدارة الاشتراك وبوابات الدفع الإلكتروني (Stripe & Fawry & Cash)' : 'Subscription & Payment Gateways'}</span>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {isAr ? 'اختر خطة الاشتراك وادفع مباشرة بالفيزا، فوري، المحافظ، أو التحويل الكاش' : 'Choose Plan & Pay via Stripe, Fawry, Mobile Wallets or Cash'}
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                  {isAr
                    ? 'ربط مباشر مع بوابات الدفع العالمية والمحلية: بطاقات الائتمان (Stripe)، شبكة فوري (Fawry Pay كود 788)، محافظ المحمول (فودافون كاش وإنستاباي)، أو الشراء الكاش المباشر مدى الحياة.'
                    : 'Direct integration with Stripe card processing, Fawry Pay 788 kiosks, mobile wallets, and official one-time cash purchase.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan('Annual');
                  setShowCheckoutModal(true);
                }}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isAr ? 'ترقية / تجديد باقة الصيدلية الآن' : 'Upgrade / Renew Subscription'}</span>
              </button>
            </div>
          </div>

          {/* 1. Current Pharmacy Subscription Status Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'حالة اشتراك وترخيص صيدليتك الحالية:' : 'Current Pharmacy Subscription License:'}</span>
              </h3>
              <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {tenantConfig.subscriptionStatus === 'Active' ? (isAr ? 'حساب نشط ومفعل سحابياً' : 'Active Account') : tenantConfig.subscriptionStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[11px]">{isAr ? 'اسم الصيدلية:' : 'Pharmacy Name:'}</span>
                <span className="font-black text-slate-900 dark:text-white truncate block">{tenantConfig.tenantName}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[11px]">{isAr ? 'الباقة الحالية:' : 'Current Tier:'}</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 block">{tenantConfig.subscriptionPlan} Plan</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[11px]">{isAr ? 'تاريخ التجديد القادم:' : 'Next Renewal:'}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono block">{tenantConfig.renewalDate}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[11px]">{isAr ? 'الفروع المصرح بها:' : 'Allowed Branches:'}</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 block">{tenantConfig.maxBranches} {isAr ? 'فروع سحابية' : 'Branches'}</span>
              </div>
            </div>
          </div>

          {/* 2. Choose Plan & Pay Directly Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{isAr ? 'باقات الاشتراك والشراء مع السداد المباشر:' : 'Subscription Plans & Direct Payment:'}</span>
              </h3>
              <span className="text-xs text-slate-500">
                {isAr ? 'اختر الباقة واضغط سداد للدفع بالبطاقة، فوري، أو كاش' : 'Choose plan and pay via Card, Fawry, or Cash'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRICING_PLANS.map((plan) => {
                const isAnnual = plan.id === 'Annual';
                const isLifetime = plan.id === 'LifetimeCash';

                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-6 border-2 flex flex-col justify-between transition relative ${
                      isAnnual
                        ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-lg'
                        : isLifetime
                        ? 'border-amber-400/80 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {plan.badgeAr && (
                      <span className={`absolute -top-3 right-6 font-black text-[10px] px-3 py-1 rounded-full uppercase shadow-xs ${
                        isLifetime ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white'
                      }`}>
                        {plan.badgeAr}
                      </span>
                    )}

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-black text-base text-slate-900 dark:text-white">
                          {isAr ? plan.titleAr : plan.titleEn}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {plan.descriptionAr}
                        </p>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-2xl text-slate-900 dark:text-white">
                            {plan.priceSAR.toLocaleString()}
                          </span>
                          <span className="font-bold text-xs text-slate-600 dark:text-slate-400">
                            SAR (ريال)
                          </span>
                          <span className="text-xs text-slate-400">
                            / {plan.priceEGP.toLocaleString()} EGP (جنيه)
                          </span>
                        </div>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
                          {plan.periodAr}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {plan.featuresAr.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutPlan(plan.id);
                          setShowCheckoutModal(true);
                        }}
                        className={`w-full py-3 rounded-2xl font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                          isLifetime
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : isAnnual
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {isLifetime
                            ? (isAr ? 'شراء كاش وتفعيل مدى الحياة 💎' : 'Pay Lifetime Cash')
                            : (isAr ? 'سداد وتفعيل الباقة الآن (Stripe / Fawry)' : 'Pay with Gateway')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Payment Gateways API Configuration (Stripe, Fawry, Mobile Wallets) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span>{isAr ? 'إعدادات ومفاتيح بوابات الدفع الإلكتروني:' : 'Payment Gateways API Configuration:'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'تخصيص بيانات الربط لمفاتيح Stripe و Fawry ومحافظ الهاتف والتحويل البنكي'
                    : 'Configure API keys for Stripe, Fawry Merchant, Wallets and Bank details'}
                </p>
              </div>

              {gatewaySaveSuccess && (
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-500/30 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {isAr ? 'تم حفظ المفاتيح في Cloud SQL بنجاح!' : 'Saved to Cloud SQL!'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stripe Configuration */}
              <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">S</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Stripe Elements (Cards & Mada)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.stripe.enabled}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          stripe: { ...prev.stripe, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span>{isAr ? 'مفعل' : 'Enabled'}</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'مفتاح النشر (Publishable Key):' : 'Publishable Key:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.stripe.publishableKey}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          stripe: { ...prev.stripe, publishableKey: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'المفتاح السري (Secret Key):' : 'Secret Key (Masked):'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.stripe.secretKeyMasked}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          stripe: { ...prev.stripe, secretKeyMasked: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Fawry Configuration */}
              <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">F</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Fawry Pay فوري باي (كود 788)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.fawry.enabled}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          fawry: { ...prev.fawry, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>{isAr ? 'مفعل' : 'Enabled'}</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'كود التاجر بفوري (Merchant Code):' : 'Merchant Code:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.fawry.merchantCode}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          fawry: { ...prev.fawry, merchantCode: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'مفتاح الأمان السري (Security Key):' : 'Security Key:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.fawry.securityKeyMasked}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          fawry: { ...prev.fawry, securityKeyMasked: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vodafone Cash & InstaPay */}
              <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">V</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">فودافون كاش وإنستاباي (Wallets)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.vodafoneCash.enabled}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          vodafoneCash: { ...prev.vodafoneCash, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-rose-600"
                    />
                    <span>{isAr ? 'مفعل' : 'Enabled'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'رقم محفظة فودافون كاش:' : 'Wallet Phone Number:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.vodafoneCash.walletNumber}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          vodafoneCash: { ...prev.vodafoneCash, walletNumber: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'عنوان إنستاباي IPA:' : 'InstaPay IPA Handle:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.instaPay.ipaHandle}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          instaPay: { ...prev.instaPay, ipaHandle: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Bank Wire & Cash */}
              <div className="p-5 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">B</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">التحويل البنكي المعتمد (IBAN Wire)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gatewayConfig.bankTransfer.enabled}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span>{isAr ? 'مفعل' : 'Enabled'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'اسم البنك المعتمد:' : 'Bank Name:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.bankTransfer.bankName}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, bankName: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      {isAr ? 'رقم الآيبان (IBAN):' : 'IBAN Number:'}
                    </label>
                    <input
                      type="text"
                      value={gatewayConfig.bankTransfer.iban}
                      onChange={(e) =>
                        setGatewayConfig((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, iban: e.target.value },
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isSavingGateways}
                onClick={async () => {
                  setIsSavingGateways(true);
                  try {
                    await apiClient.saveGatewayConfig(gatewayConfig);
                    setGatewaySaveSuccess(true);
                    setTimeout(() => setGatewaySaveSuccess(false), 3000);
                  } catch (err) {
                    console.error('Failed saving gateway settings:', err);
                    alert(isAr ? 'فشل حفظ الإعدادات على السحابة' : 'Failed to save gateway config');
                  } finally {
                    setIsSavingGateways(false);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSavingGateways ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isAr ? 'جاري الحفظ في Cloud SQL...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{isAr ? 'حفظ إعدادات ومفاتيح البوابات على السحابة' : 'Save Gateway Settings to Cloud SQL'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4. Transactions Log Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-teal-600" />
                <span>{isAr ? 'سجل عمليات السداد والدفع عبر البوابات (Transactions Log):' : 'Subscription Transactions Log:'}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                {transactions.length} {isAr ? 'عملية مسجلة' : 'Records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{isAr ? 'الرقم المرجعي' : 'Ref No.'}</th>
                    <th className="p-3">{isAr ? 'الصيدلية' : 'Pharmacy'}</th>
                    <th className="p-3">{isAr ? 'الباقة' : 'Plan'}</th>
                    <th className="p-3">{isAr ? 'البوابة / الطريقة' : 'Gateway'}</th>
                    <th className="p-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-400 select-all">
                        {t.referenceNumber}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        {t.pharmacyName}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                          {t.plan === 'LifetimeCash' ? 'كاش مدى الحياة' : t.plan === 'Annual' ? 'سنوي' : 'شهري'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-[11px] text-indigo-600 dark:text-indigo-400">
                          {t.gateway}
                        </span>
                        {t.cardLast4 && <span className="text-[10px] text-slate-400 ml-1">({t.cardLast4}•)</span>}
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-600">
                        {t.amount.toLocaleString()} {t.currency}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {t.createdAt}
                      </td>
                      <td className="p-3">
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {t.status}
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
      {/* TAB 8: LOCAL MICROSOFT SQL SERVER & HYBRID CLOUD SYNC    */}
      {/* ======================================================== */}
      {activeTab === 'sqlserver-hybrid' && (
        <LocalSqlServerManager lang={lang} />
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT PERMISSIONS (تعديل صلاحيات الموظف)           */}
      {/* ======================================================== */}
      {editingPharmacist && editingPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <Sliders className="w-5 h-5 text-teal-600" />
                <span>{isAr ? `تخصيص صلاحيات: ${editingPharmacist.nameAr}` : `Edit Permissions: ${editingPharmacist.nameEn}`}</span>
              </div>
              <button onClick={() => setEditingPharmacist(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200">
                {isAr
                  ? 'عند إلغاء تفعيل "دخول لوحة المالك"، سيختفي التبويب بالكامل من واجهة هذا الموظف تلقائياً ولن يتمكن من رؤية الأرباح أو التكاليف.'
                  : 'Disabling owner panel access completely hides the tab and restricts cost viewing.'}
              </div>

              {/* PIN Code Editor */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{isAr ? 'رمز الدخول السريع (PIN Code):' : 'PIN Code:'}</span>
                  <span className="text-[10px] text-slate-500">{isAr ? 'يستخدمه الموظف لتسجيل الدخول والتحقق' : 'Used for login'}</span>
                </div>
                <input
                  type="text"
                  maxLength={8}
                  value={editingPin}
                  onChange={(e) => setEditingPin(e.target.value)}
                  className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center font-mono text-xs font-bold"
                />
              </div>

              {/* Granular Permission Toggles */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'خيارات الوصول والصلاحيات الرقابية:' : 'Permission Toggles:'}</span>

                {[
                  {
                    key: 'canAccessOwnerPanel',
                    labelAr: 'دخول لوحة المالك والكنترول بانل (Owner Suite)',
                    descAr: 'ظهور تبويب المالك والإدارة العامة للموظف',
                  },
                  {
                    key: 'canViewProfitsAndCost',
                    labelAr: 'رؤية أسعار التكلفة وهوامش الربح',
                    descAr: 'عرض سعر شراء الأدوية وصافي أرباح المبيعات',
                  },
                  {
                    key: 'canEditPrices',
                    labelAr: 'تعديل أسعار بيع وشراء الأدوية',
                    descAr: 'تغيير تسعيرة العلبة والشريط في الكتالوج',
                  },
                  {
                    key: 'canCloseDayZReport',
                    labelAr: 'إقفال اليومية المحاسبية الشاملة (Z-Report)',
                    descAr: 'اعتماد وتوليد التقرير المالي الختامي لليوم',
                  },
                  {
                    key: 'canManageInventory',
                    labelAr: 'إدارة المخزون واستلام الشحنات الجديدة',
                    descAr: 'إضافة باتشات وأدوية جديدة للمخزن',
                  },
                  {
                    key: 'canVoidInvoices',
                    labelAr: 'إلغاء الفواتير بعد حفظها',
                    descAr: 'استرجاع الفواتير المحفوظة وتعديلها',
                  },
                  {
                    key: 'canManageDebts',
                    labelAr: 'البيع الآجل وإدارة حسابات ديون العملاء',
                    descAr: 'تسجيل البيع بالشكك وسداد المستحقات',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50 cursor-pointer transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.labelAr}</div>
                      <div className="text-[10px] text-slate-500">{item.descAr}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(editingPerms as any)[item.key]}
                      onChange={(e) =>
                        setEditingPerms({
                          ...editingPerms,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 mt-1 accent-teal-600 rounded cursor-pointer"
                    />
                  </label>
                ))}

                {/* Max Discount Input */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{isAr ? 'الحد الأقصى للخصم المسموح به (%):' : 'Max Allowed Discount %:'}</span>
                    <span className="text-[10px] text-slate-500">{isAr ? 'لا يستطيع الصيدلي تجاوزه في شاشة البيع POS' : 'POS ceiling'}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingPerms.maxDiscountPercent}
                      onChange={(e) =>
                        setEditingPerms({
                          ...editingPerms,
                          maxDiscountPercent: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                        })
                      }
                      className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center text-xs font-bold"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingPharmacist(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'حفظ وتطبيق الصلاحيات فوراً' : 'Save Permissions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD PHARMACIST                                    */}
      {/* ======================================================== */}
      {showAddPharmacistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'إضافة موظف جديد وتعيين صلاحياته' : 'Add New Staff Member'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'اسم الموظف الرباعي:' : 'Staff Name:'} *
                </label>
                <input
                  type="text"
                  placeholder="د. خالد عبد العزيز"
                  value={newPharmName}
                  onChange={(e) => setNewPharmName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'اسم المستخدم:' : 'Username:'}
                  </label>
                  <input
                    type="text"
                    placeholder="khaled"
                    value={newPharmUsername}
                    onChange={(e) => setNewPharmUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'رمز المرور (PIN):' : 'PIN Code:'} *
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={newPharmPin}
                    onChange={(e) => setNewPharmPin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-center text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'الدور الوظيفي:' : 'Role:'}
                  </label>
                  <select
                    value={newPharmRole}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setNewPharmRole(r);
                      setNewPharmPerms((prev) => ({
                        ...prev,
                        canAccessOwnerPanel: r === 'Admin',
                        canViewProfitsAndCost: r === 'Admin',
                        canEditPrices: r === 'Admin',
                        maxDiscountPercent: r === 'Admin' ? 25 : r === 'Pharmacist' ? 10 : 5,
                      }));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Pharmacist">{isAr ? 'صيدلي مناوب' : 'Pharmacist'}</option>
                    <option value="Cashier">{isAr ? 'كاشير مبيعات' : 'Cashier'}</option>
                    <option value="ShiftSupervisor">{isAr ? 'مشرف شيفت' : 'Shift Supervisor'}</option>
                    <option value="Admin">{isAr ? 'مدير فرع / مالك' : 'Admin'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'سقف الخصم (%):' : 'Max Discount %:'}
                  </label>
                  <input
                    type="number"
                    value={newPharmPerms.maxDiscountPercent}
                    onChange={(e) =>
                      setNewPharmPerms((prev) => ({
                        ...prev,
                        maxDiscountPercent: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Permission Checkbox for Owner Access */}
              <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPharmPerms.canAccessOwnerPanel}
                  onChange={(e) =>
                    setNewPharmPerms((prev) => ({
                      ...prev,
                      canAccessOwnerPanel: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-teal-600"
                />
                <span className="font-bold text-slate-900 dark:text-white">
                  {isAr ? 'منح صلاحية الوصول للوحة المالك (Owner Suite)' : 'Grant Owner Panel Access'}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddPharmacistModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (!newPharmName.trim()) return;
                  onAddPharmacist({
                    id: `ph-${Date.now()}`,
                    username: newPharmUsername || `user_${Date.now().toString().slice(-4)}`,
                    pin: newPharmPin || '1234',
                    nameAr: newPharmName,
                    nameEn: newPharmName,
                    licenseNumber: newPharmLicense || 'MOH-SA-NEW',
                    role: newPharmRole,
                    phone: newPharmPhone || '+966 50 000 0000',
                    isActive: true,
                    permissions: newPharmPerms,
                    totalSalesGenerated: 0,
                    completedShiftsCount: 0,
                    totalDiscrepancy: 0,
                  });
                  setShowAddPharmacistModal(false);
                  setNewPharmName('');
                }}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs"
              >
                {isAr ? 'إضافة الموظف' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW MEDICINE                                  */}
      {/* ======================================================== */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <span>{isAr ? 'إضافة دواء جديد لكتالوج الصيدلية' : 'Add New Medicine to Catalog'}</span>
              </div>
              <button onClick={() => setShowAddMedModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewMedicine} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'الاسم التجاري (بالعربي):' : 'Trade Name (Arabic):'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMedTradeAr}
                    onChange={(e) => setNewMedTradeAr(e.target.value)}
                    placeholder="مثال: أوغمنتين 1 غرام أقراص"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'الاسم التجاري (بالإنجليزية):' : 'Trade Name (English):'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMedTradeEn}
                    onChange={(e) => setNewMedTradeEn(e.target.value)}
                    placeholder="e.g. Augmentin 1g Tablets"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'المادة الفعالة (Active Ingredient):' : 'Active Ingredient:'}
                  </label>
                  <input
                    type="text"
                    value={newMedActiveEn}
                    onChange={(e) => setNewMedActiveEn(e.target.value)}
                    placeholder="Amoxicillin + Clavulanic Acid"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'الباركود الدولي:' : 'Barcode:'}
                  </label>
                  <input
                    type="text"
                    value={newMedBarcode}
                    onChange={(e) => setNewMedBarcode(e.target.value)}
                    placeholder="628100..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'سعر الشراء (التكلفة):' : 'Cost Price:'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newMedCostPrice}
                    onChange={(e) => setNewMedCostPrice(e.target.value)}
                    placeholder="35.00"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'سعر البيع (علبة):' : 'Selling Price (Box):'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newMedPriceBox}
                    onChange={(e) => setNewMedPriceBox(e.target.value)}
                    placeholder="52.00"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                    {isAr ? 'أشرطة بالعلبة:' : 'Strips / Box:'}
                  </label>
                  <input
                    type="number"
                    value={newMedUnitsPerBox}
                    onChange={(e) => setNewMedUnitsPerBox(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 -mx-6 -mb-6 mt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  {isAr ? 'حفظ وإضافة للمخزون' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT PRICE                                        */}
      {/* ======================================================== */}
      {showEditPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? `تعديل تسعيرة: ${showEditPriceModal.tradeNameAr}` : `Edit Price: ${showEditPriceModal.tradeNameEn}`}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'سعر بيع العلبة الكاملة (SAR):' : 'Selling Price (Box):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPriceBox}
                  onChange={(e) => {
                    setEditingPriceBox(e.target.value);
                    const p = parseFloat(e.target.value) || 0;
                    setEditingPriceStrip((p / showEditPriceModal.unitsPerBox).toFixed(2));
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'سعر بيع الشريط الواحد (SAR):' : 'Selling Price (Strip):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPriceStrip}
                  onChange={(e) => setEditingPriceStrip(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEditPriceModal(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSavePriceEdit}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
              >
                {isAr ? 'تأكيد وحفظ السعر' : 'Save Price'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUPPLIER PURCHASE ORDER GENERATOR                 */}
      {/* ======================================================== */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>{isAr ? 'أمر توريد وشراء النواقص لشركات الأدوية (Purchase Order)' : 'Supplier Purchase Order'}</span>
              </div>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-200">
                <p className="leading-relaxed">
                  {isAr
                    ? `تم حصر ${lowStockMedicines.length} أدوية وصلت إلى حد إعادة الطلب. تم احتساب الكميات المطلوبة آلياً لرفع المخزون لحد الأمان.`
                    : `Generated purchase order for ${lowStockMedicines.length} low stock items.`}
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">{isAr ? 'الدواء' : 'Medicine'}</th>
                      <th className="p-2.5">{isAr ? 'المتوفر' : 'Current'}</th>
                      <th className="p-2.5">{isAr ? 'الكمية المطلوبة' : 'Order Qty'}</th>
                      <th className="p-2.5">{isAr ? 'سعر التكلفة التقديري' : 'Est. Cost'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lowStockMedicines.map((m) => {
                      const stock = calculateTotalStock(m);
                      const neededBoxes = Math.max(10, m.reorderLevel * 2 - stock.totalBoxes);
                      const costPerBox = m.batches[0]?.costPrice || m.pricePerBox * 0.7;

                      return (
                        <tr key={m.id}>
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {isAr ? m.tradeNameAr : m.tradeNameEn}
                          </td>
                          <td className="p-2.5 font-mono text-rose-600 font-bold">
                            {stock.totalBoxes}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-purple-700 dark:text-purple-400">
                            +{neededBoxes} {isAr ? 'علبة' : 'boxes'}
                          </td>
                          <td className="p-2.5 font-mono">
                            {(neededBoxes * costPerBox).toFixed(2)} SAR
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowPOModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة أمر التوريد للموزع' : 'Print PO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD EXPENSE                                       */}
      {/* ======================================================== */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'تسجيل مصروف تشغيلي جديد' : 'Record Operating Expense'}
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'بند المصروف:' : 'Category:'}
                </label>
                <input
                  type="text"
                  required
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'المبلغ بالريال (SAR):' : 'Amount (SAR):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {isAr ? 'تسجيل وخصم المصروف' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD CUSTOMER CREDIT ACCOUNT                       */}
      {/* ======================================================== */}
      {showAddCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'فتح حساب عميل آجل جديد' : 'New Customer Credit Account'}
            </h3>

            <form onSubmit={handleAddCustomerCredit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'اسم العميل:' : 'Customer Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد العتيبي"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                  {isAr ? 'الرصيد الافتتاحي للديون (SAR):' : 'Initial Balance (SAR):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCustBalance}
                  onChange={(e) => setNewCustBalance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCreditModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {isAr ? 'فتح الحساب' : 'Open Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Subscription & Gateways Checkout Modal */}
      <SubscriptionCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        client={{
          id: tenantConfig.tenantId,
          pharmacyName: tenantConfig.tenantName,
          ownerName: 'د. مالك الصيدلية',
          phone: '+966 50 123 4567',
          subdomain: tenantConfig.clientSubdomain,
          billingCycle: checkoutPlan,
          priceAmount: checkoutPlan === 'Annual' ? 899 : checkoutPlan === 'Monthly' ? 99 : 2400,
          currency: 'SAR',
          paymentMethod: 'CreditCard',
          status: 'Active',
          startDate: new Date().toISOString().slice(0, 10),
          branchesAllowed: tenantConfig.maxBranches,
        }}
        defaultPlan={checkoutPlan}
        gatewayConfig={gatewayConfig}
        onPaymentSuccess={(newTx) => {
          setTransactions((prev) => [newTx, ...prev]);
          onUpdateTenantConfig({
            subscriptionStatus: 'Active',
            subscriptionPlan: newTx.plan === 'Annual' ? 'Professional' : newTx.plan === 'LifetimeCash' ? 'Enterprise' : 'Starter',
            renewalDate: newTx.plan === 'LifetimeCash' ? '2099-12-31' : newTx.plan === 'Annual' ? '2027-11-04' : '2026-12-04',
          });
        }}
        lang={lang}
      />
    </div>
  );
};
