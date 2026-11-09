import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudCheck, 
  Database, 
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';
import { offlineSyncEngine, SyncStatus } from '../services/offlineSyncEngine';

interface OfflineSyncBannerProps {
  onSyncSuccess?: (count: number) => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onSyncSuccess }) => {
  const [status, setStatus] = useState<SyncStatus>(offlineSyncEngine.getStatus());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = offlineSyncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    try {
      setErrorMsg(null);
      const res = await offlineSyncEngine.syncPendingInvoices();
      if (res.syncedCount > 0) {
        setSyncMessage(`تمت مزامنة ${res.syncedCount} فاتورة بنجاح مع السحابة ☁️✅`);
        if (onSyncSuccess) onSyncSuccess(res.syncedCount);
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage('كل البيانات متزامنة بالفعل مع السحابة');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذرت المزامنة');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleToggleSimulation = () => {
    const isNowSimulated = offlineSyncEngine.toggleOfflineSimulation();
    if (isNowSimulated) {
      setSyncMessage('تم تفعيل وضع محاكاة انقطاع الإنترنت 📡📴');
    } else {
      setSyncMessage('تمت العودة للاتصال بالسحابة وجاري المزامنة ☁️');
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  return (
    <div className="w-full">
      {/* Active Sync Notification Toast */}
      {syncMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-700 rounded-full">✓</span>
            <span>{syncMessage}</span>
          </div>
          <button 
            onClick={() => setSyncMessage(null)}
            className="text-white/80 hover:text-white text-xs px-2"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-white/80 hover:text-white text-xs">إغلاق</button>
        </div>
      )}

      {/* Main Banner when Offline or when Pending Queue exists */}
      {!status.effectiveOnline ? (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>وضع العمل دون إنترنت (Offline POS Active)</span>
                  {status.isSimulatedOffline && (
                    <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-semibold">
                      محاكاة تجريبية
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  الكاشير يعمل بالكامل، والفواتير تُحفظ محلياً على الجهاز وتُطبع للعميل، وستُرفع تلقائياً للسحابة فور عودة الاتصال.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-md font-mono font-bold">
                {status.pendingCount} فاتورة معلقة محلياً
              </span>
              <button
                onClick={handleToggleSimulation}
                className="text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition flex items-center gap-1.5 shadow-sm"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>إعادة الاتصال بالسحابة</span>
              </button>
            </div>
          </div>
        </div>
      ) : status.pendingCount > 0 ? (
        <div className="bg-blue-500/15 border-b border-blue-500/30 px-4 py-2.5 text-blue-900 dark:text-blue-200">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>تم استعادة الاتصال بالسحابة - فواتير معلقة</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                    {status.pendingCount}
                  </span>
                </div>
                <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                  توجد فواتير مسجلة أثناء انقطاع الإنترنت جاهزة للمزامنة مع قاعدة بيانات Cloud SQL.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                disabled={status.isSyncing}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
                <span>{status.isSyncing ? 'جاري المزامنة...' : 'مزامنة السحابة الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
