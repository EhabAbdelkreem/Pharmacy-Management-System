import type { 
  Medicine, 
  SalesInvoice, 
  Shift, 
  PharmacistUser, 
  SaaSTenantConfig, 
  SaaSClient,
  PaymentGatewayConfig,
  SubscriptionTransaction
} from '../types/pharmacy';

export const apiClient = {
  async getMedicines(): Promise<Medicine[]> {
    const res = await fetch('/api/medicines');
    if (!res.ok) throw new Error('Failed to fetch medicines');
    return res.json();
  },

  async saveMedicine(med: Medicine): Promise<void> {
    const res = await fetch('/api/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med),
    });
    if (!res.ok) throw new Error('Failed to save medicine');
  },

  async getInvoices(): Promise<SalesInvoice[]> {
    const res = await fetch('/api/sales/invoices');
    if (!res.ok) throw new Error('Failed to fetch sales invoices');
    return res.json();
  },

  async createInvoice(invoice: SalesInvoice): Promise<void> {
    const res = await fetch('/api/sales/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!res.ok) throw new Error('Failed to create sales invoice');
  },

  async syncBatchInvoices(invoices: SalesInvoice[]): Promise<{ success: boolean; syncedCount: number; message: string }> {
    const res = await fetch('/api/sales/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices }),
    });
    if (!res.ok) throw new Error('Failed to sync batch invoices');
    return res.json();
  },

  async getShifts(): Promise<Shift[]> {
    const res = await fetch('/api/shifts');
    if (!res.ok) throw new Error('Failed to fetch shifts');
    return res.json();
  },

  async saveShift(shift: Shift): Promise<void> {
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shift),
    });
    if (!res.ok) throw new Error('Failed to save shift');
  },

  async getEmployees(): Promise<PharmacistUser[]> {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },

  async saveEmployee(emp: PharmacistUser): Promise<void> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emp),
    });
    if (!res.ok) throw new Error('Failed to save employee');
  },

  async deleteEmployee(id: string): Promise<void> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete employee');
  },

  async getTenantConfig(): Promise<SaaSTenantConfig> {
    const res = await fetch('/api/saas/tenant-config');
    if (!res.ok) throw new Error('Failed to fetch tenant configuration');
    return res.json();
  },

  async saveTenantConfig(config: SaaSTenantConfig): Promise<void> {
    const res = await fetch('/api/saas/tenant-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update tenant configuration');
  },

  async syncUserWithBackend(idToken: string, name?: string): Promise<any> {
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to sync user with backend');
    return res.json();
  },

  async getSaasClients(): Promise<SaaSClient[]> {
    const res = await fetch('/api/saas/clients');
    if (!res.ok) throw new Error('Failed to fetch SaaS clients');
    return res.json();
  },

  async saveSaasClient(client: SaaSClient): Promise<void> {
    const res = await fetch('/api/saas/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) throw new Error('Failed to save SaaS client');
  },

  async deleteSaasClient(id: string): Promise<void> {
    const res = await fetch(`/api/saas/clients/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete SaaS client');
  },

  async getGatewayConfig(): Promise<PaymentGatewayConfig> {
    const res = await fetch('/api/saas/gateway-settings');
    if (!res.ok) throw new Error('Failed to fetch gateway config');
    return res.json();
  },

  async saveGatewayConfig(config: PaymentGatewayConfig): Promise<void> {
    const res = await fetch('/api/saas/gateway-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to save gateway config');
  },

  async getTransactions(): Promise<SubscriptionTransaction[]> {
    const res = await fetch('/api/saas/transactions');
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async createTransaction(tx: SubscriptionTransaction): Promise<{ success: boolean; transaction: SubscriptionTransaction }> {
    const res = await fetch('/api/saas/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error('Failed to record transaction');
    return res.json();
  },
};

