import { SalesInvoice, Medicine } from '../types/pharmacy';
import { apiClient } from './apiClient';

const OFFLINE_INVOICES_KEY = 'pharma_offline_invoices_queue';
const CACHED_MEDICINES_KEY = 'pharma_cached_medicines_catalog';
const OFFLINE_SIMULATION_KEY = 'pharma_offline_sim_active';

export interface SyncStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
}

type SyncListener = (status: SyncStatus) => void;

class OfflineSyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private isSimulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncTime: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedSim = localStorage.getItem(OFFLINE_SIMULATION_KEY);
        this.isSimulatedOffline = storedSim === 'true';
      } catch {
        this.isSimulatedOffline = false;
      }

      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());

      // Auto-sync attempt on boot if online and has pending
      setTimeout(() => {
        if (this.isEffectivelyOnline() && this.getPendingInvoices().length > 0) {
          this.syncPendingInvoices().catch(console.error);
        }
      }, 2000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  public isEffectivelyOnline(): boolean {
    if (typeof window === 'undefined') return true;
    if (this.isSimulatedOffline) return false;
    return window.navigator.onLine;
  }

  public getStatus(): SyncStatus {
    const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : true;
    return {
      isOnline,
      isSimulatedOffline: this.isSimulatedOffline,
      effectiveOnline: this.isEffectivelyOnline(),
      pendingCount: this.getPendingInvoices().length,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
  }

  public toggleOfflineSimulation(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    try {
      localStorage.setItem(OFFLINE_SIMULATION_KEY, String(this.isSimulatedOffline));
    } catch (e) {
      console.warn('Storage error:', e);
    }
    this.notify();

    // If we turned simulation off and we're real online, auto-sync pending
    if (!this.isSimulatedOffline && window.navigator.onLine) {
      this.syncPendingInvoices().catch(console.error);
    }
    return this.isSimulatedOffline;
  }

  private handleNetworkChange() {
    this.notify();
    if (this.isEffectivelyOnline() && this.getPendingInvoices().length > 0) {
      this.syncPendingInvoices().catch(console.error);
    }
  }

  // =========================================================================
  // Medicines Local Offline Cache
  // =========================================================================
  public cacheMedicines(medicines: Medicine[]): void {
    try {
      localStorage.setItem(CACHED_MEDICINES_KEY, JSON.stringify(medicines));
    } catch (e) {
      console.warn('Failed to cache medicines:', e);
    }
  }

  public getCachedMedicines(): Medicine[] {
    try {
      const data = localStorage.getItem(CACHED_MEDICINES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // =========================================================================
  // Offline Invoices Queue
  // =========================================================================
  public getPendingInvoices(): SalesInvoice[] {
    try {
      const data = localStorage.getItem(OFFLINE_INVOICES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public queueInvoice(invoice: SalesInvoice): void {
    const queue = this.getPendingInvoices();
    // Tag invoice with offline metadata
    const taggedInvoice: SalesInvoice = {
      ...invoice,
      notes: (invoice.notes ? invoice.notes + ' ' : '') + '[سُجلت دون إنترنت]',
    };

    queue.push(taggedInvoice);
    try {
      localStorage.setItem(OFFLINE_INVOICES_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to store offline invoice:', e);
    }
    this.notify();
  }

  public async syncPendingInvoices(): Promise<{ syncedCount: number; message: string }> {
    if (this.isSyncing) {
      return { syncedCount: 0, message: 'المزامنة جارية بالفعل' };
    }

    const pending = this.getPendingInvoices();
    if (pending.length === 0) {
      return { syncedCount: 0, message: 'لا توجد فواتير معلقة' };
    }

    if (!this.isEffectivelyOnline()) {
      return { syncedCount: 0, message: 'لا يمكن المزامنة حالياً لعدم توفر الاتصال' };
    }

    this.isSyncing = true;
    this.notify();

    try {
      const result = await apiClient.syncBatchInvoices(pending);
      // Clear offline queue on successful cloud sync
      localStorage.removeItem(OFFLINE_INVOICES_KEY);
      this.lastSyncTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.isSyncing = false;
      this.notify();
      return {
        syncedCount: result.syncedCount,
        message: `تمت مزامنة ${result.syncedCount} فاتورة مع السحابة بنجاح`,
      };
    } catch (error: any) {
      this.isSyncing = false;
      this.notify();
      console.error('Offline batch sync error:', error);
      throw error;
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
