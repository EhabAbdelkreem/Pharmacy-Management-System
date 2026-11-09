import React from 'react';
import { 
  ShoppingCart, 
  Boxes, 
  Wallet, 
  Barcode, 
  Globe, 
  Building2, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Activity,
  Lock,
  ArrowRightLeft,
  CalendarCheck,
  LayoutDashboard,
  User,
  ShieldCheck,
  Users,
  LogOut,
  Crown,
  KeyRound,
  TrendingUp
} from 'lucide-react';
import { Shift, PharmacistUser } from '../types/pharmacy';
import { offlineSyncEngine, SyncStatus } from '../services/offlineSyncEngine';
import { Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  activeTab: 'pos' | 'inventory' | 'shifts' | 'contracts' | 'reports' | 'owner' | 'clients';
  setActiveTab: (tab: 'pos' | 'inventory' | 'shifts' | 'contracts' | 'reports' | 'owner' | 'clients') => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  currentShift: Shift | null;
  currentUser: PharmacistUser | null;
  onOpenLoginModal: () => void;
  onOpenAuthPage: () => void;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
  onSwitchToStaff?: () => void;
  lowStockCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  theme,
  setTheme,
  currentShift,
  currentUser,
  onOpenLoginModal,
  onOpenAuthPage,
  onLogout,
  onSwitchToAdmin,
  onSwitchToStaff,
  lowStockCount,
}) => {
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const isShiftOpen = currentShift && currentShift.status === 'Open';
  const isAdmin = currentUser?.role === 'Admin';

  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(offlineSyncEngine.getStatus());

  React.useEffect(() => {
    return offlineSyncEngine.subscribe((newStatus) => {
      setSyncStatus(newStatus);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* Top Operational Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Left: Pharmacist & Shift Operational Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Role Indicator Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold border transition ${
            isAdmin
              ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs'
              : 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
          }`}>
            {isAdmin ? <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
            <span className="font-extrabold">{currentUser?.nameAr || 'المستخدم'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              isAdmin ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-teal-500/20 text-teal-800 dark:text-teal-300'
            }`}>
              {isAdmin ? (isAr ? '👑 مدير (صلاحيات كاملة)' : 'Admin') : (isAr ? '👨‍⚕️ موظف (صلاحيات مقيدة)' : 'Staff')}
            </span>
          </div>

          {/* Quick 1-Click Role Switcher for instant live permission testing */}
          {isAdmin ? (
            onSwitchToStaff && (
              <button
                type="button"
                onClick={onSwitchToStaff}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 font-bold text-[11px] transition cursor-pointer"
                title={isAr ? 'تجربة النظام بصلاحيات الموظف (سيتم إخفاء لوحة المالك والعملاء وتكلفة الشراء)' : 'Switch to Staff Role (Restrictions active)'}
              >
                <span>{isAr ? '🔄 تجربة دور الموظف' : 'Switch to Staff'}</span>
              </button>
            )
          ) : (
            onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-700 font-bold text-[11px] transition cursor-pointer"
                title={isAr ? 'الترقية لدور المدير (إظهار كافة التبويبات وأسعار الشراء)' : 'Switch to Manager Role (Full access)'}
              >
                <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{isAr ? '👑 تبديل للمدير' : 'Switch to Admin'}</span>
              </button>
            )
          )}

          {isShiftOpen ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 rounded-md font-semibold text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>
                {isAr ? `الشيفت #${currentShift.shiftNumber} مفتوح` : `Shift #${currentShift.shiftNumber} Active`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-1 rounded-md font-semibold text-[11px]">
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{isAr ? 'الشيفت مغلق' : 'Shift Closed'}</span>
            </div>
          )}
        </div>

        {/* Right: Auth Page Button, Logout, Quick Shift/Day Action & Theme/Language Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Dedicated Auth Page Opener Button */}
          <button
            onClick={onOpenAuthPage}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-md transition font-extrabold text-xs cursor-pointer shadow-xs"
            title={isAr ? 'فتح صفحة تسجيل الدخول والاشتراك الرئيسية' : 'Open Login & Registration Page'}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isAr ? 'صفحة الدخول والتسجيل' : 'Login / Register'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-md transition font-bold text-xs cursor-pointer"
            title={isAr ? 'تسجيل الخروج من النظام والعودة لصفحة الدخول' : 'Sign out'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'خروج' : 'Logout'}</span>
          </button>

          {/* Quick Change / Close Shift Button */}
          <button
            onClick={() => setActiveTab('shifts')}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer"
            title={isAr ? 'إدارة الشيفتات وتقفيل اليومية' : 'Manage Shifts & Daily Close'}
          >
            <ArrowRightLeft className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            <span className="hidden md:inline">{isAr ? 'الشيفت / اليوم' : 'Shifts'}</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-md transition border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            title={isDark ? 'التبديل إلى الوضع النهاري الطبي' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{isAr ? 'النهاري' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{isAr ? 'الليلي' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Cloud Sync & Offline Status Indicator with Toggle Simulation */}
          <button
            onClick={() => offlineSyncEngine.toggleOfflineSimulation()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition cursor-pointer ${
              syncStatus.effectiveOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-100 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 animate-pulse hover:bg-amber-200'
            }`}
            title={
              syncStatus.effectiveOnline
                ? (isAr ? 'متصل بقاعدة البيانات السحابية Cloud SQL (اضغط لتجربة وضع الأوفلاين)' : 'Connected to Cloud SQL (Click to simulate offline)')
                : (isAr ? 'وضع الأوفلاين نشط - الفواتير تُحفظ محلياً (اضغط للعودة للسحابة)' : 'Offline mode active (Click to return to cloud)')
            }
          >
            {syncStatus.effectiveOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">{isAr ? 'سحابي متصل' : 'Cloud Live'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{isAr ? 'أوفلاين محلي' : 'Offline Mode'}</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] px-1 rounded-full font-mono">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-md transition border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Main Brand & Clean 4-Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center shadow-xs text-white font-bold">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                PharmaCore
              </span>
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded">
                Enterprise .NET 9
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'نظام إدارة الصيدليات المتكامل ونقطة البيع FEFO' : 'Enterprise Pharmacy & FEFO Management'}
            </p>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'pos'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isAr ? 'نقطة البيع السريعة' : 'Fast POS'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono hidden md:inline ${
              activeTab === 'pos' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              F1-F9
            </span>
          </button>

          {/* Contracts & Insurance Tab */}
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'contracts'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'التعاقدات والتأمين' : 'Contracts & Insurance'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold hidden lg:inline ${
              activeTab === 'contracts'
                ? 'bg-emerald-800 text-emerald-100'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
            }`}>
              {isAr ? 'المطالبات' : 'Claims'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{isAr ? 'المخزون والنواقص' : 'Inventory & Restock'}</span>
            {lowStockCount !== undefined && lowStockCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono shadow-xs">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Monthly Drug Consumption & Demand Forecasting Tab */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'reports'
                ? 'bg-violet-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span>{isAr ? 'تقارير الاستهلاك والتنبؤ' : 'Consumption & Forecast'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
              activeTab === 'reports'
                ? 'bg-violet-800 text-violet-100'
                : 'bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300'
            }`}>
              {isAr ? 'شهري' : 'Monthly'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'shifts'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{isAr ? 'الشيفتات واليومية' : 'Shifts & Daily'}</span>
          </button>

          {/* Manager / Owner Suite - Strictly Hidden for non-managers */}
          {currentUser?.permissions.canAccessOwnerPanel && (
            <button
              onClick={() => setActiveTab('owner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'owner'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{isAr ? 'لوحة المالك (SaaS)' : 'Owner Suite'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                activeTab === 'owner' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
              }`}>
                PRO
              </span>
            </button>
          )}

          {/* Super Admin Clients & Subscriptions CRM Tab */}
          {currentUser?.permissions.canAccessOwnerPanel && (
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'clients'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isAr ? 'متابعة العملاء والاشتراكات' : 'Clients CRM'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                activeTab === 'clients' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300'
              }`}>
                CRM
              </span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
