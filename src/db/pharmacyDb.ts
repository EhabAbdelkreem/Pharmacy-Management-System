import { db } from './index.ts';
import { 
  medicines, 
  salesInvoices, 
  shifts, 
  employees, 
  tenantSettings, 
  saasClients,
  subscriptionTransactions,
  paymentGatewaySettings
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import type { 
  Medicine, 
  SalesInvoice, 
  Shift, 
  PharmacistUser, 
  SaaSTenantConfig, 
  SaaSClient,
  PaymentGatewayConfig,
  SubscriptionTransaction
} from '../types/pharmacy.ts';

// ---------------- MEDICINES REPOSITORY ----------------
export async function getDbMedicines(): Promise<Medicine[]> {
  try {
    const rows = await db.select().from(medicines);
    return rows.map((r) => ({
      id: r.id,
      tradeNameAr: r.tradeNameAr,
      tradeNameEn: r.tradeNameEn,
      activeIngredientAr: r.activeIngredientAr || '',
      activeIngredientEn: r.activeIngredientEn || '',
      barcode: r.barcode,
      internalCode: r.internalCode || '',
      categoryAr: r.categoryAr || '',
      categoryEn: r.categoryEn || '',
      dosageForm: r.dosageForm as any,
      reorderLevel: r.reorderLevel || 10,
      requiresPrescription: r.requiresPrescription || false,
      unitsPerBox: r.unitsPerBox || 1,
      pricePerBox: r.pricePerBox,
      pricePerStrip: r.pricePerStrip,
      batches: r.batches ? JSON.parse(r.batches) : [],
    }));
  } catch (error) {
    console.error("Database query failed for medicines:", error);
    throw new Error("Failed to retrieve medicines from cloud database.", { cause: error });
  }
}

export async function upsertDbMedicine(med: Medicine) {
  try {
    const serializedBatches = JSON.stringify(med.batches || []);
    await db.insert(medicines)
      .values({
        id: med.id,
        tradeNameAr: med.tradeNameAr,
        tradeNameEn: med.tradeNameEn,
        activeIngredientAr: med.activeIngredientAr,
        activeIngredientEn: med.activeIngredientEn,
        barcode: med.barcode,
        internalCode: med.internalCode,
        categoryAr: med.categoryAr,
        categoryEn: med.categoryEn,
        dosageForm: med.dosageForm,
        reorderLevel: med.reorderLevel,
        requiresPrescription: med.requiresPrescription,
        unitsPerBox: med.unitsPerBox,
        pricePerBox: med.pricePerBox,
        pricePerStrip: med.pricePerStrip,
        batches: serializedBatches,
      })
      .onConflictDoUpdate({
        target: medicines.id,
        set: {
          tradeNameAr: med.tradeNameAr,
          tradeNameEn: med.tradeNameEn,
          activeIngredientAr: med.activeIngredientAr,
          activeIngredientEn: med.activeIngredientEn,
          barcode: med.barcode,
          internalCode: med.internalCode,
          categoryAr: med.categoryAr,
          categoryEn: med.categoryEn,
          dosageForm: med.dosageForm,
          reorderLevel: med.reorderLevel,
          requiresPrescription: med.requiresPrescription,
          unitsPerBox: med.unitsPerBox,
          pricePerBox: med.pricePerBox,
          pricePerStrip: med.pricePerStrip,
          batches: serializedBatches,
        },
      });
  } catch (error) {
    console.error("Database upsert failed for medicine:", error);
    throw new Error("Failed to save medicine record.", { cause: error });
  }
}

export async function seedInitialMedicinesIfEmpty(defaultList: Medicine[]) {
  try {
    const existing = await db.select({ id: medicines.id }).from(medicines).limit(1);
    if (existing.length === 0 && defaultList.length > 0) {
      console.log(`Seeding Cloud SQL with ${defaultList.length} comprehensive medicines...`);
      for (const med of defaultList) {
        await upsertDbMedicine(med);
      }
      console.log("Cloud SQL medicines catalog seeded successfully.");
    }
  } catch (error) {
    console.error("Failed to seed medicines catalog:", error);
  }
}

// ---------------- SALES INVOICES REPOSITORY ----------------
export async function getDbInvoices(): Promise<SalesInvoice[]> {
  try {
    const rows = await db.select().from(salesInvoices).orderBy(desc(salesInvoices.createdAt)).limit(100);
    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      dateTime: r.dateTime,
      pharmacistName: r.pharmacistName,
      pharmacistId: r.pharmacistId,
      shiftId: r.shiftId,
      customerName: r.customerName || undefined,
      paymentMethod: r.paymentMethod as any,
      subTotal: r.subTotal,
      taxAmount: r.taxAmount || 0,
      discountAmount: r.discountAmount || 0,
      grandTotal: r.grandTotal,
      paidAmount: r.paidAmount || r.grandTotal,
      changeAmount: r.changeAmount || 0,
      items: JSON.parse(r.items),
      qrCodeData: r.qrCodeData || '',
    }));
  } catch (error) {
    console.error("Database query failed for sales invoices:", error);
    throw new Error("Failed to retrieve sales invoices.", { cause: error });
  }
}

export async function createDbInvoice(inv: SalesInvoice) {
  try {
    await db.insert(salesInvoices).values({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      dateTime: inv.dateTime,
      pharmacistName: inv.pharmacistName,
      pharmacistId: inv.pharmacistId,
      shiftId: inv.shiftId,
      customerName: inv.customerName,
      paymentMethod: inv.paymentMethod,
      subTotal: inv.subTotal,
      taxAmount: inv.taxAmount,
      discountAmount: inv.discountAmount,
      grandTotal: inv.grandTotal,
      paidAmount: inv.paidAmount,
      changeAmount: inv.changeAmount,
      items: JSON.stringify(inv.items),
      qrCodeData: inv.qrCodeData,
    });
  } catch (error) {
    console.error("Database insert failed for invoice:", error);
    throw new Error("Failed to record sales invoice in database.", { cause: error });
  }
}

// ---------------- SHIFTS REPOSITORY ----------------
export async function getDbShifts(): Promise<Shift[]> {
  try {
    const rows = await db.select().from(shifts).orderBy(desc(shifts.createdAt)).limit(50);
    return rows.map((r) => ({
      id: r.id,
      shiftNumber: r.shiftNumber,
      pharmacistId: r.pharmacistId,
      pharmacistName: r.pharmacistName,
      status: r.status as any,
      openedAt: r.openedAt,
      closedAt: r.closedAt || undefined,
      openingCash: r.openingCash || 0,
      totalCashSales: r.totalCashSales || 0,
      totalCardSales: r.totalCardSales || 0,
      totalInsuranceSales: r.totalInsuranceSales || 0,
      cashWithdrawals: r.cashWithdrawals || 0,
      expectedCashTotal: r.expectedCashTotal || 0,
      actualCashCounted: r.actualCashCounted ?? undefined,
      variance: r.variance ?? undefined,
      closureNotes: r.closureNotes || undefined,
      invoicesCount: r.invoicesCount || 0,
    }));
  } catch (error) {
    console.error("Database query failed for shifts:", error);
    throw new Error("Failed to retrieve shift logs.", { cause: error });
  }
}

export async function saveDbShift(sh: Shift) {
  try {
    await db.insert(shifts)
      .values({
        id: sh.id,
        shiftNumber: sh.shiftNumber,
        pharmacistId: sh.pharmacistId,
        pharmacistName: sh.pharmacistName,
        status: sh.status,
        openedAt: sh.openedAt,
        closedAt: sh.closedAt,
        openingCash: sh.openingCash,
        totalCashSales: sh.totalCashSales,
        totalCardSales: sh.totalCardSales,
        totalInsuranceSales: sh.totalInsuranceSales,
        cashWithdrawals: sh.cashWithdrawals,
        expectedCashTotal: sh.expectedCashTotal,
        actualCashCounted: sh.actualCashCounted,
        variance: sh.variance,
        closureNotes: sh.closureNotes,
        invoicesCount: sh.invoicesCount,
      })
      .onConflictDoUpdate({
        target: shifts.id,
        set: {
          status: sh.status,
          closedAt: sh.closedAt,
          totalCashSales: sh.totalCashSales,
          totalCardSales: sh.totalCardSales,
          totalInsuranceSales: sh.totalInsuranceSales,
          cashWithdrawals: sh.cashWithdrawals,
          expectedCashTotal: sh.expectedCashTotal,
          actualCashCounted: sh.actualCashCounted,
          variance: sh.variance,
          closureNotes: sh.closureNotes,
          invoicesCount: sh.invoicesCount,
        },
      });
  } catch (error) {
    console.error("Database save failed for shift:", error);
    throw new Error("Failed to save shift details.", { cause: error });
  }
}

// ---------------- EMPLOYEES & RBAC REPOSITORY ----------------
export async function getDbEmployees(): Promise<PharmacistUser[]> {
  try {
    const rows = await db.select().from(employees);
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      pin: r.pin,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      licenseNumber: r.licenseNumber || '',
      role: r.role as any,
      phone: r.phone || '',
      isActive: r.isActive ?? true,
      permissions: JSON.parse(r.permissions),
      totalSalesGenerated: r.totalSalesGenerated || 0,
      completedShiftsCount: r.completedShiftsCount || 0,
      totalDiscrepancy: r.totalDiscrepancy || 0,
    }));
  } catch (error) {
    console.error("Database query failed for employees:", error);
    throw new Error("Failed to retrieve staff employees.", { cause: error });
  }
}

export async function saveDbEmployee(emp: PharmacistUser) {
  try {
    await db.insert(employees)
      .values({
        id: emp.id,
        username: emp.username,
        pin: emp.pin,
        nameAr: emp.nameAr,
        nameEn: emp.nameEn,
        licenseNumber: emp.licenseNumber,
        role: emp.role,
        phone: emp.phone,
        isActive: emp.isActive,
        permissions: JSON.stringify(emp.permissions),
        totalSalesGenerated: emp.totalSalesGenerated,
        completedShiftsCount: emp.completedShiftsCount,
        totalDiscrepancy: emp.totalDiscrepancy,
      })
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          username: emp.username,
          pin: emp.pin,
          nameAr: emp.nameAr,
          nameEn: emp.nameEn,
          licenseNumber: emp.licenseNumber,
          role: emp.role,
          phone: emp.phone,
          isActive: emp.isActive,
          permissions: JSON.stringify(emp.permissions),
          totalSalesGenerated: emp.totalSalesGenerated,
          completedShiftsCount: emp.completedShiftsCount,
          totalDiscrepancy: emp.totalDiscrepancy,
        },
      });
  } catch (error) {
    console.error("Database save failed for employee:", error);
    throw new Error("Failed to update staff record.", { cause: error });
  }
}

export async function deleteDbEmployee(id: string) {
  try {
    await db.delete(employees).where(eq(employees.id, id));
  } catch (error) {
    console.error("Database delete failed for employee:", error);
    throw new Error("Failed to delete staff record.", { cause: error });
  }
}

export async function seedInitialEmployeesIfEmpty(defaultList: PharmacistUser[]) {
  try {
    const existing = await db.select({ id: employees.id }).from(employees).limit(1);
    if (existing.length === 0 && defaultList.length > 0) {
      for (const emp of defaultList) {
        await saveDbEmployee(emp);
      }
      console.log("Initial employees and permissions seeded to Cloud SQL.");
    }
  } catch (error) {
    console.error("Failed to seed initial employees:", error);
  }
}

// ---------------- TENANT / SAAS SETTINGS REPOSITORY ----------------
export async function getDbTenantSettings(): Promise<SaaSTenantConfig | null> {
  try {
    const rows = await db.select().from(tenantSettings).limit(1);
    if (rows.length === 0) return null;
    if (rows[0].configJson) {
      return JSON.parse(rows[0].configJson);
    }
    return null;
  } catch (error) {
    console.error("Database query failed for tenant settings:", error);
    return null;
  }
}

export async function saveDbTenantSettings(config: SaaSTenantConfig) {
  try {
    await db.insert(tenantSettings)
      .values({
        tenantId: config.tenantId,
        tenantName: config.tenantName,
        clientSubdomain: config.clientSubdomain,
        customDomain: config.customDomain,
        subscriptionPlan: config.subscriptionPlan,
        subscriptionStatus: config.subscriptionStatus,
        cloudDatabaseType: config.cloudDatabaseType,
        cloudSyncStatus: config.cloudSyncStatus,
        configJson: JSON.stringify(config),
      })
      .onConflictDoUpdate({
        target: tenantSettings.tenantId,
        set: {
          tenantName: config.tenantName,
          clientSubdomain: config.clientSubdomain,
          customDomain: config.customDomain,
          subscriptionPlan: config.subscriptionPlan,
          subscriptionStatus: config.subscriptionStatus,
          cloudDatabaseType: config.cloudDatabaseType,
          cloudSyncStatus: config.cloudSyncStatus,
          configJson: JSON.stringify(config),
        },
      });
  } catch (error) {
    console.error("Database save failed for tenant settings:", error);
    throw new Error("Failed to save pharmacy cloud tenant configuration.", { cause: error });
  }
}

// ---------------- SAAS CLIENTS & SUBSCRIPTIONS REPOSITORY ----------------
export async function getDbSaasClients(): Promise<SaaSClient[]> {
  try {
    const rows = await db.select().from(saasClients);
    return rows.map((r) => ({
      id: r.id,
      pharmacyName: r.pharmacyName,
      ownerName: r.ownerName,
      phone: r.phone,
      email: r.email || undefined,
      city: r.city || undefined,
      subdomain: r.subdomain,
      billingCycle: r.billingCycle as any,
      priceAmount: r.priceAmount,
      currency: (r.currency || 'SAR') as any,
      paymentMethod: (r.paymentMethod || 'Cash') as any,
      status: (r.status || 'Active') as any,
      startDate: r.startDate,
      endDate: r.endDate || undefined,
      branchesAllowed: r.branchesAllowed || 1,
      notes: r.notes || undefined,
    }));
  } catch (error) {
    console.error("Database query failed for saas clients:", error);
    return [];
  }
}

export async function saveDbSaasClient(client: SaaSClient) {
  try {
    await db.insert(saasClients)
      .values({
        id: client.id,
        pharmacyName: client.pharmacyName,
        ownerName: client.ownerName,
        phone: client.phone,
        email: client.email || null,
        city: client.city || null,
        subdomain: client.subdomain,
        billingCycle: client.billingCycle,
        priceAmount: client.priceAmount,
        currency: client.currency,
        paymentMethod: client.paymentMethod,
        status: client.status,
        startDate: client.startDate,
        endDate: client.endDate || null,
        branchesAllowed: client.branchesAllowed || 1,
        notes: client.notes || null,
      })
      .onConflictDoUpdate({
        target: saasClients.id,
        set: {
          pharmacyName: client.pharmacyName,
          ownerName: client.ownerName,
          phone: client.phone,
          email: client.email || null,
          city: client.city || null,
          subdomain: client.subdomain,
          billingCycle: client.billingCycle,
          priceAmount: client.priceAmount,
          currency: client.currency,
          paymentMethod: client.paymentMethod,
          status: client.status,
          startDate: client.startDate,
          endDate: client.endDate || null,
          branchesAllowed: client.branchesAllowed || 1,
          notes: client.notes || null,
        },
      });
  } catch (error) {
    console.error("Database save failed for saas client:", error);
    throw new Error("Failed to save client subscription.", { cause: error });
  }
}

export async function deleteDbSaasClient(id: string) {
  try {
    await db.delete(saasClients).where(eq(saasClients.id, id));
  } catch (error) {
    console.error("Database delete failed for saas client:", error);
    throw new Error("Failed to delete client.", { cause: error });
  }
}

export async function seedInitialSaasClientsIfEmpty(defaultList: SaaSClient[]) {
  try {
    const existing = await db.select({ id: saasClients.id }).from(saasClients).limit(1);
    if (existing.length === 0 && defaultList.length > 0) {
      for (const cli of defaultList) {
        await saveDbSaasClient(cli);
      }
      console.log("Initial SaaS client pharmacies seeded to Cloud SQL.");
    }
  } catch (error) {
    console.error("Failed to seed initial SaaS clients:", error);
  }
}

// ---------------- PAYMENT GATEWAYS & TRANSACTIONS REPOSITORY ----------------
export async function getDbPaymentGatewayConfig(): Promise<PaymentGatewayConfig | null> {
  try {
    const rows = await db.select().from(paymentGatewaySettings).where(eq(paymentGatewaySettings.settingKey, 'main_config')).limit(1);
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].configJson);
  } catch (error) {
    console.error("Database query failed for payment gateway settings:", error);
    return null;
  }
}

export async function saveDbPaymentGatewayConfig(config: PaymentGatewayConfig): Promise<void> {
  try {
    await db.insert(paymentGatewaySettings)
      .values({
        settingKey: 'main_config',
        configJson: JSON.stringify(config),
      })
      .onConflictDoUpdate({
        target: paymentGatewaySettings.settingKey,
        set: {
          configJson: JSON.stringify(config),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Database save failed for payment gateway config:", error);
    throw new Error("Failed to save payment gateway settings.", { cause: error });
  }
}

export async function getDbSubscriptionTransactions(): Promise<SubscriptionTransaction[]> {
  try {
    const rows = await db.select().from(subscriptionTransactions).orderBy(desc(subscriptionTransactions.createdAt));
    return rows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      pharmacyName: r.pharmacyName,
      payerName: r.payerName,
      payerPhone: r.payerPhone || '',
      plan: r.plan as any,
      gateway: r.gateway as any,
      amount: r.amount,
      currency: (r.currency as any) || 'SAR',
      status: (r.status as any) || 'Completed',
      referenceNumber: r.referenceNumber,
      cardLast4: r.cardLast4 || undefined,
      cardBrand: r.cardBrand || undefined,
      fawryRefCode: r.fawryRefCode || undefined,
      fawryExpireAt: r.fawryExpireAt || undefined,
      vodafoneCashRef: r.vodafoneCashRef || undefined,
      createdAt: r.createdAt,
      receiptNotes: r.receiptNotes || undefined,
    }));
  } catch (error) {
    console.error("Database query failed for subscription transactions:", error);
    return [];
  }
}

export async function saveDbSubscriptionTransaction(tx: SubscriptionTransaction): Promise<void> {
  try {
    await db.insert(subscriptionTransactions)
      .values({
        id: tx.id,
        clientId: tx.clientId,
        pharmacyName: tx.pharmacyName,
        payerName: tx.payerName,
        payerPhone: tx.payerPhone || null,
        plan: tx.plan,
        gateway: tx.gateway,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        referenceNumber: tx.referenceNumber,
        cardLast4: tx.cardLast4 || null,
        cardBrand: tx.cardBrand || null,
        fawryRefCode: tx.fawryRefCode || null,
        fawryExpireAt: tx.fawryExpireAt || null,
        vodafoneCashRef: tx.vodafoneCashRef || null,
        createdAt: tx.createdAt,
        receiptNotes: tx.receiptNotes || null,
      })
      .onConflictDoUpdate({
        target: subscriptionTransactions.id,
        set: {
          clientId: tx.clientId,
          pharmacyName: tx.pharmacyName,
          payerName: tx.payerName,
          payerPhone: tx.payerPhone || null,
          plan: tx.plan,
          gateway: tx.gateway,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          referenceNumber: tx.referenceNumber,
          cardLast4: tx.cardLast4 || null,
          cardBrand: tx.cardBrand || null,
          fawryRefCode: tx.fawryRefCode || null,
          fawryExpireAt: tx.fawryExpireAt || null,
          vodafoneCashRef: tx.vodafoneCashRef || null,
          createdAt: tx.createdAt,
          receiptNotes: tx.receiptNotes || null,
        },
      });
  } catch (error) {
    console.error("Database save failed for subscription transaction:", error);
    throw new Error("Failed to save subscription transaction.", { cause: error });
  }
}

export async function seedInitialTransactionsIfEmpty(defaultList: SubscriptionTransaction[]) {
  try {
    const existing = await db.select({ id: subscriptionTransactions.id }).from(subscriptionTransactions).limit(1);
    if (existing.length === 0 && defaultList.length > 0) {
      for (const tx of defaultList) {
        await saveDbSubscriptionTransaction(tx);
      }
      console.log("Initial subscription transactions seeded to Cloud SQL.");
    }
  } catch (error) {
    console.error("Failed to seed initial subscription transactions:", error);
  }
}

