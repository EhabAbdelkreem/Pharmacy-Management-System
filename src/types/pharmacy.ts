export type DosageForm = 
  | 'Tablets' // أقراص
  | 'Syrup' // شراب
  | 'Capsules' // كبسولات
  | 'Injection' // حقن
  | 'Ointment' // مرهم
  | 'Cream' // كريم
  | 'Drops' // قطرة
  | 'Inhaler' // بخاخ صدر
  | 'Spray' // بخاخ موضعي/أنف
  | 'Sachet' // أكياس/فوار
  | 'Suppository' // تحاميل
  | 'Patch'; // لصقة

export type UnitType = 'Box' | 'Strip';

export type InteractionSeverity = 'Fatal' | 'Severe' | 'Moderate' | 'Minor';

export type PaymentMethod = 'Cash' | 'Card' | 'Insurance' | 'OnlineElectronic' | 'Fawry' | 'VodafoneCash' | 'InstaPay';

export type ShiftStatus = 'Open' | 'Closed';

export interface BatchItem {
  id: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  costPrice: number;
  sellingPriceBox: number;
  sellingPriceStrip: number;
  quantityBoxesAvailable: number;
  quantityStripsAvailable: number; // remaining loose strips
  shelfLocation: string;
  medicineId: string;
}

export interface Medicine {
  id: string;
  tradeNameAr: string;
  tradeNameEn: string;
  activeIngredientAr: string;
  activeIngredientEn: string;
  barcode: string;
  internalCode: string;
  categoryAr: string;
  categoryEn: string;
  dosageForm: DosageForm;
  reorderLevel: number; // in boxes
  requiresPrescription: boolean;
  unitsPerBox: number; // e.g. 2 strips or 3 strips
  pricePerBox: number;
  pricePerStrip: number;
  batches: BatchItem[];
  imageUrl?: string;
  description?: string;
}

export interface DrugInteraction {
  id: string;
  ingredient1En: string;
  ingredient1Ar: string;
  ingredient2En: string;
  ingredient2Ar: string;
  severity: InteractionSeverity;
  clinicalEffectEn: string;
  clinicalEffectAr: string;
  managementEn: string;
  managementAr: string;
}

export interface CartItem {
  medicine: Medicine;
  selectedBatch: BatchItem;
  unitType: UnitType; // Box or Strip
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  isFefoAutoSelected: boolean;
}

export interface SalesInvoiceItem {
  id: string;
  medicineId: string;
  tradeNameEn: string;
  tradeNameAr: string;
  batchNumber: string;
  expiryDate: string;
  unitType: UnitType;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  dateTime: string;
  pharmacistName: string;
  pharmacistId: string;
  shiftId: string;
  customerName?: string;
  paymentMethod: PaymentMethod;
  subTotal: number;
  taxAmount: number; // e.g. 0% or 15%
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  items: SalesInvoiceItem[];
  qrCodeData: string;
  notes?: string;
  isOfflineSync?: boolean;
  // Corporate & Insurance Contract integration fields
  insuranceContractId?: string;
  insuranceCompanyName?: string;
  insuranceCardNumber?: string;
  insuranceApprovalNumber?: string;
  insuranceCoPayPercent?: number;
  patientCoPayAmount?: number;
  insuranceClaimAmount?: number;
}

export interface Shift {
  id: string;
  shiftNumber: number;
  pharmacistId: string;
  pharmacistName: string;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  totalCashSales: number;
  totalCardSales: number;
  totalInsuranceSales: number;
  cashWithdrawals: number;
  expectedCashTotal: number;
  actualCashCounted?: number;
  variance?: number; // actual - expected (negative = deficit, positive = surplus)
  closureNotes?: string;
  invoicesCount: number;
}

export interface DailyCloseReport {
  id: string;
  reportNumber: string; // e.g. Z-REP-20261101
  date: string;
  closedAt: string;
  closedByPharmacist: string;
  totalShiftsCount: number;
  totalInvoicesCount: number;
  totalGrossSales: number;
  totalDiscount: number;
  totalNetSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalInsuranceSales: number;
  totalExpenses: number;
  totalOpeningCash: number;
  totalExpectedCash: number;
  totalActualCashCounted: number;
  totalNetVariance: number;
  status: 'Audited' | 'Finalized';
  notes?: string;
}

export interface PharmacySettings {
  pharmacyNameAr: string;
  pharmacyNameEn: string;
  branchNameAr: string;
  branchNameEn: string;
  taxNumber: string;
  commercialReg: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  taxRatePercent: number;
}

export interface StaffPermissions {
  canAccessOwnerPanel: boolean;
  canViewProfitsAndCost: boolean;
  canEditPrices: boolean;
  canCloseDayZReport: boolean;
  canManageInventory: boolean;
  canManageStaff: boolean;
  canVoidInvoices: boolean;
  canGiveDiscount: boolean;
  maxDiscountPercent: number;
  canManageDebts: boolean;
}

export interface PharmacistUser {
  id: string;
  username: string;
  pin: string;
  nameAr: string;
  nameEn: string;
  licenseNumber: string;
  role: 'Admin' | 'ShiftSupervisor' | 'Pharmacist' | 'Cashier';
  phone: string;
  isActive: boolean;
  permissions: StaffPermissions;
  totalSalesGenerated: number;
  completedShiftsCount: number;
  totalDiscrepancy: number;
}

export interface SaaSTenantConfig {
  tenantId: string;
  tenantName: string;
  clientSubdomain: string;
  customDomain?: string;
  subscriptionPlan: 'Starter' | 'Professional' | 'Enterprise';
  subscriptionStatus: 'Active' | 'Trial' | 'Suspended';
  renewalDate: string;
  maxBranches: number;
  currentBranches: number;
  cloudDatabaseType: 'Multi-Tenant Cloud SQL (PostgreSQL)' | 'Serverless Firestore Real-Time' | 'Dedicated Cloud Cluster';
  cloudSyncStatus: 'Connected & Live' | 'Syncing' | 'Offline Ready';
  lastCloudBackup: string;
  allowedMaxDiscountPercent: number;
  enforceBlindDrawerCount: boolean;
  requireManagerOverrideOnFatalInteraction: boolean;
  allowDeferredCreditSales: boolean;
}

export type BillingCycle = 'Monthly' | 'Annual' | 'LifetimeCash';
export type ClientSubscriptionStatus = 'Active' | 'PendingRenewal' | 'Expired' | 'Trial';

export interface SaaSClient {
  id: string;
  pharmacyName: string;
  ownerName: string;
  phone: string;
  email?: string;
  city?: string;
  subdomain: string;
  billingCycle: BillingCycle;
  priceAmount: number;
  currency: 'SAR' | 'EGP';
  paymentMethod: 'Cash' | 'BankTransfer' | 'VodafoneCash' | 'CreditCard';
  status: ClientSubscriptionStatus;
  startDate: string;
  endDate?: string;
  branchesAllowed: number;
  notes?: string;
}

export interface PricingPlanOption {
  id: BillingCycle;
  titleAr: string;
  titleEn: string;
  badgeAr?: string;
  periodAr: string;
  priceSAR: number;
  priceEGP: number;
  descriptionAr: string;
  featuresAr: string[];
  isPopular?: boolean;
}

export type PaymentGatewayType = 'stripe' | 'fawry' | 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'cash';

export interface PaymentGatewayConfig {
  stripe: {
    enabled: boolean;
    publishableKey: string;
    secretKeyMasked: string;
    isTestMode: boolean;
  };
  fawry: {
    enabled: boolean;
    merchantCode: string;
    securityKeyMasked: string;
    isTestMode: boolean;
  };
  vodafoneCash: {
    enabled: boolean;
    walletNumber: string;
    accountHolder: string;
  };
  instaPay: {
    enabled: boolean;
    ipaHandle: string;
    accountNumber: string;
    accountHolder: string;
  };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    iban: string;
    accountHolder: string;
  };
}

export interface SubscriptionTransaction {
  id: string;
  clientId: string;
  pharmacyName: string;
  payerName: string;
  payerPhone: string;
  plan: BillingCycle;
  gateway: PaymentGatewayType;
  amount: number;
  currency: 'SAR' | 'EGP';
  status: 'Completed' | 'Pending' | 'Failed';
  referenceNumber: string;
  cardLast4?: string;
  cardBrand?: string;
  fawryRefCode?: string;
  fawryExpireAt?: string;
  vodafoneCashRef?: string;
  createdAt: string;
  receiptNotes?: string;
}

export interface InsuranceContract {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'Insurance' | 'CorporateDirect' | 'Syndicate';
  defaultCoPayPercent: number; // e.g. 10 for 10%
  maxCoPayCap?: number; // e.g. 100 max co-pay
  prescriptionLimit?: number; // e.g. 1500
  discountPercent: number; // e.g. 5%
  status: 'Active' | 'Suspended';
  phone?: string;
  contactPerson?: string;
  email?: string;
  notes?: string;
  totalClaimsCount?: number;
  totalClaimsValue?: number;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string; // e.g. CLM-2026-1048
  invoiceId: string;
  invoiceNumber: string;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  patientName: string;
  cardNumber: string;
  nationalId?: string;
  approvalNumber?: string;
  totalInvoiceAmount: number;
  discountAmount: number;
  patientPaidAmount: number;
  claimAmount: number;
  status: 'Pending' | 'Approved' | 'Settled' | 'Rejected';
  createdAt: string;
  settledAt?: string;
  itemsCount: number;
  rejectionReason?: string;
  notes?: string;
}

