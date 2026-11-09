import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';
import { 
  getDbMedicines, 
  upsertDbMedicine, 
  seedInitialMedicinesIfEmpty,
  getDbInvoices,
  createDbInvoice,
  getDbShifts,
  saveDbShift,
  getDbEmployees,
  saveDbEmployee,
  deleteDbEmployee,
  seedInitialEmployeesIfEmpty,
  getDbTenantSettings,
  saveDbTenantSettings,
  getDbSaasClients,
  saveDbSaasClient,
  deleteDbSaasClient,
  seedInitialSaasClientsIfEmpty,
  getDbPaymentGatewayConfig,
  saveDbPaymentGatewayConfig,
  getDbSubscriptionTransactions,
  saveDbSubscriptionTransaction,
  seedInitialTransactionsIfEmpty
} from './src/db/pharmacyDb.ts';
import { COMPREHENSIVE_MEDICINES } from './src/data/comprehensiveMedicines.ts';
import { 
  INITIAL_PHARMACISTS, 
  INITIAL_TENANT_CONFIG, 
  INITIAL_SAAS_CLIENTS,
  DEFAULT_PAYMENT_GATEWAYS_CONFIG,
  INITIAL_SUBSCRIPTION_TRANSACTIONS 
} from './src/data/mockData.ts';

import path from 'path';
import fs from 'fs';
dotenv.config();
process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

app.use(express.json({ limit: '10mb' }));

// Serve static assets from public/ with correct PWA MIME headers
app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('manifest.json') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    } else if (filePath.endsWith('sw.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
    }
  }
}));

app.get(['/manifest.json', '/manifest.webmanifest'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(PUBLIC_DIR, 'manifest.json'));
});

app.get('/sw.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
});

// =========================================================================
// 1. Health & Cloud SQL Status API
// =========================================================================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'Healthy',
    framework: '.NET Core Web API / Clean Architecture Express Host',
    database: 'Cloud SQL (PostgreSQL with Drizzle ORM)',
    cloudSync: 'Live',
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// 2. Authentication & User Profile APIs
// =========================================================================
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, uid, name } = req.user as any;
    const user = await getOrCreateUser(uid, email || '', name || req.body.name || '');
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user profile:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user profile' });
  }
});

app.get('/api/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await getUsers();
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// =========================================================================
// 3. Medicines & Catalog APIs (.NET Core Controller Pattern)
// =========================================================================
app.get('/api/medicines', async (req: Request, res: Response) => {
  try {
    let list = await getDbMedicines();
    if (list.length === 0) {
      // Auto-seed with the comprehensive catalog if empty
      await seedInitialMedicinesIfEmpty(COMPREHENSIVE_MEDICINES);
      list = await getDbMedicines();
      if (list.length === 0) {
        list = COMPREHENSIVE_MEDICINES;
      }
    }
    res.json(list);
  } catch (error: any) {
    console.error('API /api/medicines error:', error);
    // Graceful fallback to static catalog
    res.json(COMPREHENSIVE_MEDICINES);
  }
});

app.post('/api/medicines', async (req: Request, res: Response) => {
  try {
    const medicine = req.body;
    if (!medicine.id || !medicine.tradeNameAr || !medicine.barcode) {
      return res.status(400).json({ error: 'Missing required medicine attributes' });
    }
    await upsertDbMedicine(medicine);
    res.status(201).json({ success: true, medicine });
  } catch (error: any) {
    console.error('API POST /api/medicines error:', error);
    res.status(500).json({ error: error.message || 'Failed to save medicine' });
  }
});

// =========================================================================
// 4. Sales Invoices & POS APIs (With FEFO Batch Stock Reduction)
// =========================================================================
app.get('/api/sales/invoices', async (req: Request, res: Response) => {
  try {
    const invoices = await getDbInvoices();
    res.json(invoices);
  } catch (error: any) {
    console.error('API /api/sales/invoices error:', error);
    res.json([]);
  }
});

app.post('/api/sales/invoices', async (req: Request, res: Response) => {
  try {
    const invoice = req.body;
    if (!invoice.id || !invoice.invoiceNumber || !invoice.items) {
      return res.status(400).json({ error: 'Invalid invoice payload' });
    }

    // 1. Record invoice in Cloud SQL
    await createDbInvoice(invoice);

    // 2. Adjust batch stocks in Cloud SQL for affected medicines
    try {
      const allMeds = await getDbMedicines();
      for (const item of invoice.items) {
        const med = allMeds.find((m) => m.id === item.medicineId);
        if (med) {
          const updatedBatches = med.batches.map((b) => {
            if (b.batchNumber === item.batchNumber) {
              let newBoxes = b.quantityBoxesAvailable;
              let newStrips = b.quantityStripsAvailable;
              if (item.unitType === 'Box') {
                newBoxes = Math.max(0, newBoxes - item.quantity);
              } else {
                if (newStrips >= item.quantity) {
                  newStrips -= item.quantity;
                } else {
                  const needed = item.quantity - newStrips;
                  newStrips = 0;
                  const boxesToBreak = Math.ceil(needed / med.unitsPerBox);
                  newBoxes = Math.max(0, newBoxes - boxesToBreak);
                  newStrips = (boxesToBreak * med.unitsPerBox) - needed;
                }
              }
              return { ...b, quantityBoxesAvailable: newBoxes, quantityStripsAvailable: newStrips };
            }
            return b;
          });
          med.batches = updatedBatches;
          await upsertDbMedicine(med);
        }
      }
    } catch (stockErr) {
      console.error('Stock adjustment warning:', stockErr);
    }

    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    console.error('API POST /api/sales/invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to process sales invoice' });
  }
});

app.post('/api/sales/sync-batch', async (req: Request, res: Response) => {
  try {
    const { invoices } = req.body;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: 'No invoices provided for batch sync' });
    }

    const existingInvoices = await getDbInvoices();
    const existingIds = new Set(existingInvoices.map((inv) => inv.id));
    let syncedCount = 0;

    for (const invoice of invoices) {
      if (!invoice.id || existingIds.has(invoice.id)) {
        continue;
      }

      await createDbInvoice(invoice);
      syncedCount++;

      // Adjust batch stocks in Cloud SQL for affected medicines
      try {
        const allMeds = await getDbMedicines();
        for (const item of invoice.items) {
          const med = allMeds.find((m) => m.id === item.medicineId);
          if (med) {
            const updatedBatches = med.batches.map((b) => {
              if (b.batchNumber === item.batchNumber) {
                let newBoxes = b.quantityBoxesAvailable;
                let newStrips = b.quantityStripsAvailable;
                if (item.unitType === 'Box') {
                  newBoxes = Math.max(0, newBoxes - item.quantity);
                } else {
                  if (newStrips >= item.quantity) {
                    newStrips -= item.quantity;
                  } else {
                    const needed = item.quantity - newStrips;
                    newStrips = 0;
                    const boxesToBreak = Math.ceil(needed / med.unitsPerBox);
                    newBoxes = Math.max(0, newBoxes - boxesToBreak);
                    newStrips = (boxesToBreak * med.unitsPerBox) - needed;
                  }
                }
                return { ...b, quantityBoxesAvailable: newBoxes, quantityStripsAvailable: newStrips };
              }
              return b;
            });
            med.batches = updatedBatches;
            await upsertDbMedicine(med);
          }
        }
      } catch (stockErr) {
        console.error('Sync batch stock adjustment warning:', stockErr);
      }
    }

    res.status(200).json({
      success: true,
      syncedCount,
      totalReceived: invoices.length,
      message: `Successfully synchronized ${syncedCount} offline invoices to Cloud SQL`,
    });
  } catch (error: any) {
    console.error('API POST /api/sales/sync-batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync offline batch' });
  }
});


// =========================================================================
// 5. Work Shifts & Cash Register APIs
// =========================================================================
app.get('/api/shifts', async (req: Request, res: Response) => {
  try {
    const shiftsList = await getDbShifts();
    res.json(shiftsList);
  } catch (error: any) {
    console.error('API /api/shifts error:', error);
    res.json([]);
  }
});

app.post('/api/shifts', async (req: Request, res: Response) => {
  try {
    const shift = req.body;
    if (!shift.id || !shift.shiftNumber) {
      return res.status(400).json({ error: 'Invalid shift payload' });
    }
    await saveDbShift(shift);
    res.status(200).json({ success: true, shift });
  } catch (error: any) {
    console.error('API POST /api/shifts error:', error);
    res.status(500).json({ error: error.message || 'Failed to update shift' });
  }
});

// =========================================================================
// 6. Employees & RBAC Permission Management APIs
// =========================================================================
app.get('/api/employees', async (req: Request, res: Response) => {
  try {
    let emps = await getDbEmployees();
    if (emps.length === 0) {
      await seedInitialEmployeesIfEmpty(INITIAL_PHARMACISTS);
      emps = await getDbEmployees();
      if (emps.length === 0) {
        emps = INITIAL_PHARMACISTS;
      }
    }
    res.json(emps);
  } catch (error: any) {
    console.error('API /api/employees error:', error);
    res.json(INITIAL_PHARMACISTS);
  }
});

app.post('/api/employees', async (req: Request, res: Response) => {
  try {
    const employee = req.body;
    if (!employee.id || !employee.username || !employee.role) {
      return res.status(400).json({ error: 'Invalid employee data' });
    }
    await saveDbEmployee(employee);
    res.status(200).json({ success: true, employee });
  } catch (error: any) {
    console.error('API POST /api/employees error:', error);
    res.status(500).json({ error: error.message || 'Failed to save employee record' });
  }
});

app.delete('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDbEmployee(id);
    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (error: any) {
    console.error('API DELETE /api/employees error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete employee' });
  }
});

// =========================================================================
// 7. SaaS Tenant Link & Multi-Tenant Cloud Sync APIs
// =========================================================================
app.get('/api/saas/tenant-config', async (req: Request, res: Response) => {
  try {
    let config = await getDbTenantSettings();
    if (!config) {
      config = INITIAL_TENANT_CONFIG;
      await saveDbTenantSettings(config);
    }
    res.json(config);
  } catch (error: any) {
    console.error('API /api/saas/tenant-config error:', error);
    res.json(INITIAL_TENANT_CONFIG);
  }
});

app.put('/api/saas/tenant-config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    await saveDbTenantSettings(config);
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('API PUT /api/saas/tenant-config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save SaaS tenant config' });
  }
});

// =========================================================================
// 8. Super Admin SaaS Clients CRM & Subscription Management APIs
// =========================================================================
app.get('/api/saas/clients', async (req: Request, res: Response) => {
  try {
    let clients = await getDbSaasClients();
    if (clients.length === 0) {
      await seedInitialSaasClientsIfEmpty(INITIAL_SAAS_CLIENTS);
      clients = await getDbSaasClients();
      if (clients.length === 0) clients = INITIAL_SAAS_CLIENTS;
    }
    res.json(clients);
  } catch (error: any) {
    console.error('API /api/saas/clients error:', error);
    res.json(INITIAL_SAAS_CLIENTS);
  }
});

app.post('/api/saas/clients', async (req: Request, res: Response) => {
  try {
    const client = req.body;
    if (!client.id || !client.pharmacyName || !client.subdomain) {
      return res.status(400).json({ error: 'Missing required client fields' });
    }
    await saveDbSaasClient(client);
    res.status(200).json({ success: true, client });
  } catch (error: any) {
    console.error('API POST /api/saas/clients error:', error);
    res.status(500).json({ error: error.message || 'Failed to save client' });
  }
});

app.delete('/api/saas/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDbSaasClient(id);
    res.json({ success: true, message: 'Client subscription deleted' });
  } catch (error: any) {
    console.error('API DELETE /api/saas/clients error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete client' });
  }
});

// =========================================================================
// 9. Payment Gateways (Stripe, Fawry, Vodafone Cash, InstaPay, Cash) APIs
// =========================================================================
app.get('/api/saas/gateway-settings', async (req: Request, res: Response) => {
  try {
    let config = await getDbPaymentGatewayConfig();
    if (!config) {
      config = DEFAULT_PAYMENT_GATEWAYS_CONFIG;
      await saveDbPaymentGatewayConfig(config);
    }
    res.json(config);
  } catch (error: any) {
    console.error('API /api/saas/gateway-settings error:', error);
    res.json(DEFAULT_PAYMENT_GATEWAYS_CONFIG);
  }
});

app.post('/api/saas/gateway-settings', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    await saveDbPaymentGatewayConfig(config);
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('API POST /api/saas/gateway-settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to save payment gateway settings' });
  }
});

app.get('/api/saas/transactions', async (req: Request, res: Response) => {
  try {
    let txs = await getDbSubscriptionTransactions();
    if (txs.length === 0) {
      await seedInitialTransactionsIfEmpty(INITIAL_SUBSCRIPTION_TRANSACTIONS);
      txs = await getDbSubscriptionTransactions();
      if (txs.length === 0) txs = INITIAL_SUBSCRIPTION_TRANSACTIONS;
    }
    res.json(txs);
  } catch (error: any) {
    console.error('API /api/saas/transactions error:', error);
    res.json(INITIAL_SUBSCRIPTION_TRANSACTIONS);
  }
});

app.post('/api/saas/transactions', async (req: Request, res: Response) => {
  try {
    const tx = req.body;
    if (!tx.id || !tx.clientId || !tx.amount) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    await saveDbSubscriptionTransaction(tx);

    // If transaction is completed, automatically extend or activate the client subscription
    if (tx.status === 'Completed') {
      try {
        const clients = await getDbSaasClients();
        const client = clients.find((c) => c.id === tx.clientId);
        if (client) {
          const now = new Date();
          const startDate = now.toISOString().slice(0, 10);
          let endDate: string | undefined;

          if (tx.plan === 'Monthly') {
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            endDate = nextMonth.toISOString().slice(0, 10);
          } else if (tx.plan === 'Annual') {
            const nextYear = new Date(now);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            endDate = nextYear.toISOString().slice(0, 10);
          } else {
            // Lifetime Cash
            endDate = '2099-12-31';
          }

          const updatedClient = {
            ...client,
            billingCycle: tx.plan,
            priceAmount: tx.amount,
            currency: tx.currency,
            status: 'Active' as const,
            startDate,
            endDate,
            paymentMethod: tx.gateway === 'stripe' ? ('CreditCard' as const) : tx.gateway === 'fawry' || tx.gateway === 'vodafone_cash' ? ('VodafoneCash' as const) : ('Cash' as const),
          };
          await saveDbSaasClient(updatedClient);
        }
      } catch (subErr) {
        console.error('Warning auto-updating client subscription upon payment:', subErr);
      }
    }

    res.status(201).json({ success: true, transaction: tx });
  } catch (error: any) {
    console.error('API POST /api/saas/transactions error:', error);
    res.status(500).json({ error: error.message || 'Failed to save transaction' });
  }
});

// =========================================================================
// 10. Express + Vite Integration
// =========================================================================
async function startServer() {
  // Pre-seed Cloud SQL data on boot lazily
  try {
    await seedInitialEmployeesIfEmpty(INITIAL_PHARMACISTS);
    await seedInitialMedicinesIfEmpty(COMPREHENSIVE_MEDICINES);
    await seedInitialSaasClientsIfEmpty(INITIAL_SAAS_CLIENTS);
    await seedInitialTransactionsIfEmpty(INITIAL_SUBSCRIPTION_TRANSACTIONS);
  } catch (err) {
    console.log('Lazy database seed notice:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmaCore Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
