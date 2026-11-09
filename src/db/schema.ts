import { pgTable, serial, text, timestamp, integer, boolean, doublePrecision } from 'drizzle-orm/pg-core';

// Users table (links Firebase Auth UID to relational record)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Pharmacy Medicines & Catalog table
export const medicines = pgTable('medicines', {
  id: text('id').primaryKey(),
  tradeNameAr: text('trade_name_ar').notNull(),
  tradeNameEn: text('trade_name_en').notNull(),
  activeIngredientAr: text('active_ingredient_ar'),
  activeIngredientEn: text('active_ingredient_en'),
  barcode: text('barcode').notNull(),
  internalCode: text('internal_code'),
  categoryAr: text('category_ar'),
  categoryEn: text('category_en'),
  dosageForm: text('dosage_form').notNull(),
  reorderLevel: integer('reorder_level').default(10),
  requiresPrescription: boolean('requires_prescription').default(false),
  unitsPerBox: integer('units_per_box').default(1),
  pricePerBox: doublePrecision('price_per_box').notNull(),
  pricePerStrip: doublePrecision('price_per_strip').notNull(),
  batches: text('batches'), // JSON serialized array of batches with FEFO dates and quantities
  createdAt: timestamp('created_at').defaultNow(),
});

// Sales Invoices table
export const salesInvoices = pgTable('sales_invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  dateTime: text('date_time').notNull(),
  pharmacistName: text('pharmacist_name').notNull(),
  pharmacistId: text('pharmacist_id').notNull(),
  shiftId: text('shift_id').notNull(),
  customerName: text('customer_name'),
  paymentMethod: text('payment_method').notNull(),
  subTotal: doublePrecision('sub_total').notNull(),
  taxAmount: doublePrecision('tax_amount').default(0),
  discountAmount: doublePrecision('discount_amount').default(0),
  grandTotal: doublePrecision('grand_total').notNull(),
  paidAmount: doublePrecision('paid_amount'),
  changeAmount: doublePrecision('change_amount'),
  items: text('items').notNull(), // JSON serialized invoice items
  qrCodeData: text('qr_code_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Work Shifts & Cash Register Balances table
export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  shiftNumber: integer('shift_number').notNull(),
  pharmacistId: text('pharmacist_id').notNull(),
  pharmacistName: text('pharmacist_name').notNull(),
  status: text('status').notNull(), // 'Open' | 'Closed'
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingCash: doublePrecision('opening_cash').default(0),
  totalCashSales: doublePrecision('total_cash_sales').default(0),
  totalCardSales: doublePrecision('total_card_sales').default(0),
  totalInsuranceSales: doublePrecision('total_insurance_sales').default(0),
  cashWithdrawals: doublePrecision('cash_withdrawals').default(0),
  expectedCashTotal: doublePrecision('expected_cash_total').default(0),
  actualCashCounted: doublePrecision('actual_cash_counted'),
  variance: doublePrecision('variance'),
  closureNotes: text('closure_notes'),
  invoicesCount: integer('invoices_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Employees & Granular Permissions (RBAC) table
export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  pin: text('pin').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  licenseNumber: text('license_number'),
  role: text('role').notNull(), // 'Admin' | 'ShiftSupervisor' | 'Pharmacist' | 'Cashier'
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  permissions: text('permissions').notNull(), // JSON serialized StaffPermissions
  totalSalesGenerated: doublePrecision('total_sales_generated').default(0),
  completedShiftsCount: integer('completed_shifts_count').default(0),
  totalDiscrepancy: doublePrecision('total_discrepancy').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Pharmacy Tenant & Cloud Multi-tenant Sync Configuration table
export const tenantSettings = pgTable('tenant_settings', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().unique(),
  tenantName: text('tenant_name').notNull(),
  clientSubdomain: text('client_subdomain').notNull(),
  customDomain: text('custom_domain'),
  subscriptionPlan: text('subscription_plan').default('Professional'),
  subscriptionStatus: text('subscription_status').default('Active'),
  cloudDatabaseType: text('cloud_database_type').default('Multi-Tenant Cloud SQL (PostgreSQL)'),
  cloudSyncStatus: text('cloud_sync_status').default('Connected & Live'),
  configJson: text('config_json'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SaaS Client Pharmacies & Subscription CRM table (متابعة عملاء الصيدليات والاشتراكات)
export const saasClients = pgTable('saas_clients', {
  id: text('id').primaryKey(),
  pharmacyName: text('pharmacy_name').notNull(),
  ownerName: text('owner_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  city: text('city'),
  subdomain: text('subdomain').notNull().unique(),
  billingCycle: text('billing_cycle').notNull(), // 'Monthly' | 'Annual' | 'LifetimeCash'
  priceAmount: doublePrecision('price_amount').notNull(),
  currency: text('currency').default('SAR'),
  paymentMethod: text('payment_method').default('Cash'), // 'Cash' | 'BankTransfer' | 'VodafoneCash' | 'CreditCard'
  status: text('status').default('Active'), // 'Active' | 'PendingRenewal' | 'Expired' | 'Trial'
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  branchesAllowed: integer('branches_allowed').default(1),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Subscription Payment Transactions table (سجل عمليات الدفع عبر البوابات Stripe / Fawry / Cash)
export const subscriptionTransactions = pgTable('subscription_transactions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  pharmacyName: text('pharmacy_name').notNull(),
  payerName: text('payer_name').notNull(),
  payerPhone: text('payer_phone'),
  plan: text('plan').notNull(), // 'Monthly' | 'Annual' | 'LifetimeCash'
  gateway: text('gateway').notNull(), // 'stripe' | 'fawry' | 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'cash'
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').default('SAR'),
  status: text('status').default('Completed'), // 'Completed' | 'Pending' | 'Failed'
  referenceNumber: text('reference_number').notNull(),
  cardLast4: text('card_last4'),
  cardBrand: text('card_brand'),
  fawryRefCode: text('fawry_ref_code'),
  fawryExpireAt: text('fawry_expire_at'),
  vodafoneCashRef: text('vodafone_cash_ref'),
  createdAt: text('created_at').notNull(),
  receiptNotes: text('receipt_notes'),
});

// Payment Gateway Settings table (إعدادات مفاتيح الربط لبوابات الدفع Stripe و Fawry والمحافظ)
export const paymentGatewaySettings = pgTable('payment_gateway_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(), // e.g. 'main_config'
  configJson: text('config_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

