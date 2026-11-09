import React, { useState } from 'react';
import { PharmacistUser, SaaSClient, BillingCycle } from '../types/pharmacy';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiClient } from '../services/apiClient';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  CreditCard, 
  Sparkles, 
  Crown, 
  UserCheck, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Layers, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Users,
  LayoutDashboard,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';

interface AuthPageProps {
  currentUser: PharmacistUser | null;
  pharmacists: PharmacistUser[];
  onLogin: (user: PharmacistUser) => void;
  onRegisterStaff: (newUser: PharmacistUser) => void;
  onRegisterPharmacyClient?: (client: SaaSClient) => void;
  activePharmacyClient?: SaaSClient | null;
  lang: 'ar' | 'en';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  pharmacists,
  onLogin,
  onRegisterStaff,
  onRegisterPharmacyClient,
  activePharmacyClient,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [registerType, setRegisterType] = useState<'pharmacy' | 'staff'>('pharmacy');

  // Login form state
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser ? currentUser.id : (pharmacists[0]?.id || '')
  );
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // New Pharmacy Client Registration State
  const [newPharmName, setNewPharmName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [chosenCycle, setChosenCycle] = useState<BillingCycle>('Annual');
  const [chosenCurrency, setChosenCurrency] = useState<'SAR' | 'EGP'>('SAR');
  const [chosenPaymentMethod, setChosenPaymentMethod] = useState<'Cash' | 'BankTransfer' | 'VodafoneCash' | 'CreditCard'>('CreditCard');
  const [pharmRegSuccess, setPharmRegSuccess] = useState<string | null>(null);

  // Register staff form state
  const [regNameAr, setRegNameAr] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regRole, setRegRole] = useState<'Admin' | 'ShiftSupervisor' | 'Pharmacist' | 'Cashier'>('Pharmacist');
  const [regLicense, setRegLicense] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState('');

  const selectedPharmacist = pharmacists.find((p) => p.id === selectedUserId) || pharmacists[0];

  // Quick 1-click login helper
  const handleQuickLogin = (user: PharmacistUser) => {
    onLogin(user);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const displayName = result.user.displayName || result.user.email || 'المالك العام';

      try {
        await apiClient.syncUserWithBackend(idToken, displayName);
      } catch (e) {
        console.warn('Backend user profile sync warning:', e);
      }

      let user = pharmacists.find((p) => p.username === result.user.uid || p.nameAr === displayName);
      if (!user) {
        user = {
          id: result.user.uid,
          username: result.user.email || result.user.uid,
          pin: '1234',
          nameAr: displayName,
          nameEn: result.user.displayName || 'Owner Admin',
          licenseNumber: 'MOH-SA-OWNER',
          role: 'Admin',
          phone: result.user.phoneNumber || '',
          isActive: true,
          permissions: {
            canAccessOwnerPanel: true,
            canViewProfitsAndCost: true,
            canEditPrices: true,
            canCloseDayZReport: true,
            canManageInventory: true,
            canManageStaff: true,
            canVoidInvoices: true,
            canGiveDiscount: true,
            maxDiscountPercent: 100,
            canManageDebts: true,
          },
          totalSalesGenerated: 0,
          completedShiftsCount: 0,
          totalDiscrepancy: 0,
        };
        onRegisterStaff(user);
      }
      onLogin(user);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setLoginError(isAr ? `فشل تسجيل الدخول بـ Google: ${err.message}` : `Google Sign-In failed: ${err.message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleExecuteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!selectedPharmacist) {
      setLoginError(isAr ? 'يرجى اختيار حساب للدخول' : 'Please select an account');
      return;
    }

    if (pinInput !== selectedPharmacist.pin) {
      setLoginError(isAr ? 'رمز المرور (PIN) غير صحيح!' : 'Invalid PIN Code!');
      return;
    }

    onLogin(selectedPharmacist);
  };

  const handleExecutePharmacyRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmName.trim() || !newOwnerName.trim()) {
      setRegError(isAr ? 'يرجى إدخال اسم الصيدلية واسم المالك' : 'Please enter pharmacy and owner names');
      return;
    }

    const sub = newSubdomain.trim() || newPharmName.toLowerCase().replace(/[^a-z0-9]/g, '') || `pharm_${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    let endDate = '';
    let price = 0;

    if (chosenCycle === 'Monthly') {
      now.setMonth(now.getMonth() + 1);
      endDate = now.toISOString().split('T')[0];
      price = chosenCurrency === 'EGP' ? 299 : 99;
    } else if (chosenCycle === 'Annual') {
      now.setFullYear(now.getFullYear() + 1);
      endDate = now.toISOString().split('T')[0];
      price = chosenCurrency === 'EGP' ? 2499 : 899;
    } else {
      endDate = '2099-12-31';
      price = chosenCurrency === 'EGP' ? 5999 : 2400;
    }

    const newClient: SaaSClient = {
      id: `cli-${Date.now()}`,
      pharmacyName: newPharmName.trim(),
      ownerName: newOwnerName.trim(),
      phone: newPhone.trim() || '+966 50 000 0000',
      city: newCity.trim() || undefined,
      subdomain: sub,
      billingCycle: chosenCycle,
      priceAmount: price,
      currency: chosenCurrency,
      paymentMethod: chosenPaymentMethod,
      status: 'Active',
      startDate,
      endDate,
      branchesAllowed: chosenCycle === 'LifetimeCash' ? 5 : chosenCycle === 'Annual' ? 3 : 1,
      notes: `تم التسجيل عبر بوابة الدخول - ${chosenCycle}`,
    };

    if (onRegisterPharmacyClient) {
      onRegisterPharmacyClient(newClient);
    }

    const newAdminUser: PharmacistUser = {
      id: `user-${Date.now()}`,
      username: sub,
      pin: '1234',
      nameAr: newOwnerName.trim(),
      nameEn: newOwnerName.trim(),
      licenseNumber: 'MOH-OWNER-NEW',
      role: 'Admin',
      phone: newPhone.trim(),
      isActive: true,
      permissions: {
        canAccessOwnerPanel: true,
        canViewProfitsAndCost: true,
        canEditPrices: true,
        canCloseDayZReport: true,
        canManageInventory: true,
        canManageStaff: true,
        canVoidInvoices: true,
        canGiveDiscount: true,
        maxDiscountPercent: 100,
        canManageDebts: true,
      },
      totalSalesGenerated: 0,
      completedShiftsCount: 0,
      totalDiscrepancy: 0,
    };

    onRegisterStaff(newAdminUser);
    onLogin(newAdminUser);
  };

  const handleExecuteStaffRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regNameAr.trim() || !regPin.trim()) {
      setRegError(isAr ? 'يرجى إكمال الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    const newUser: PharmacistUser = {
      id: `ph-${Date.now()}`,
      username: regUsername.trim() || `user_${Date.now().toString().slice(-4)}`,
      pin: regPin.trim(),
      nameAr: regNameAr.trim(),
      nameEn: regNameAr.trim(),
      licenseNumber: regLicense.trim() || 'MOH-SA-NEW',
      role: regRole,
      phone: regPhone.trim() || '+966 50 000 0000',
      isActive: true,
      permissions: {
        canAccessOwnerPanel: regRole === 'Admin',
        canViewProfitsAndCost: regRole === 'Admin',
        canEditPrices: regRole === 'Admin',
        canCloseDayZReport: regRole === 'Admin' || regRole === 'ShiftSupervisor',
        canManageInventory: regRole === 'Admin' || regRole === 'ShiftSupervisor' || regRole === 'Pharmacist',
        canManageStaff: regRole === 'Admin',
        canVoidInvoices: regRole === 'Admin',
        canGiveDiscount: regRole !== 'Cashier',
        maxDiscountPercent: regRole === 'Admin' ? 25 : regRole === 'Pharmacist' ? 10 : 0,
        canManageDebts: regRole === 'Admin' || regRole === 'ShiftSupervisor',
      },
      totalSalesGenerated: 0,
      completedShiftsCount: 0,
      totalDiscrepancy: 0,
    };

    onRegisterStaff(newUser);
    onLogin(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-600 selection:text-white" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner with direct return option if logged in */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 font-black">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white">PharmaCore</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded font-bold uppercase">
                Enterprise .NET 9
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAr ? 'بوابة تسجيل الدخول وتفعيل صلاحيات المدير والموظف' : 'Authentication & Role-Based Access Control'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left/Main Column: Auth & Registration Forms (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          {/* Branded Welcome Banner for Specific Pharmacy Link */}
          {activePharmacyClient && (
            <div className="bg-gradient-to-r from-teal-950/90 to-slate-900 border-2 border-teal-500/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">{activePharmacyClient.pharmacyName}</span>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      {isAr ? '✓ ترخيص نشط' : 'Active License'}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-200/80 mt-0.5">
                    {isAr
                      ? `بوابة صيدلية (${activePharmacyClient.pharmacyName}) الرسمية. سجّل الدخول بصفتك مديراً أو موظفاً.`
                      : `Official portal for ${activePharmacyClient.pharmacyName}. Please sign in with your role.`}
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-teal-300/80 bg-teal-950/80 border border-teal-800 px-2 py-1 rounded-lg hidden sm:block">
                @{activePharmacyClient.subdomain}
              </div>
            </div>
          )}

          {/* Tabs: Login vs Register */}
          <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setRegError('');
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل جديد واشتراك' : 'Create Account'}</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: LOGIN                                                              */}
          {/* ========================================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              
              {/* SECTION: Quick 1-Click Role Switch & Demo Logins */}
              <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-300 font-bold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? 'تجربة سريعة وفورية للصلاحيات بنقرة واحدة:' : '1-Click Quick Demo Login:'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
                    {isAr ? 'بدون كتابة رمز' : 'Instant Switch'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Admin */}
                  <div className="bg-slate-800/80 hover:bg-slate-800 border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          👑 مدير النظام
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">PIN: 1234</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-2">د. أحمد المهدي</h4>
                      <p className="text-[10px] text-amber-200/80 mt-0.5">
                        {isAr ? 'صلاحيات كاملة + لوحة المالك والعملاء وتكلفة الشراء' : 'Full Admin & Owner Access'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const adminUser = pharmacists.find((p) => p.role === 'Admin') || pharmacists[0];
                        handleQuickLogin(adminUser);
                      }}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black text-xs py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>{isAr ? 'دخول كمدير (Admin)' : 'Login as Admin'}</span>
                    </button>
                  </div>

                  {/* Option 2: Pharmacist */}
                  <div className="bg-slate-800/80 hover:bg-slate-800 border border-teal-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          👨‍⚕️ صيدلي مناوب
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">PIN: 2233</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-2">د. سارة العتيبي</h4>
                      <p className="text-[10px] text-teal-200/80 mt-0.5">
                        {isAr ? 'صلاحيات موظف (محجوب لوحة المالك وتكلفة الشراء)' : 'Pharmacist POS, restricted costs'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const pharmUser = pharmacists.find((p) => p.role === 'Pharmacist') || pharmacists[1] || pharmacists[0];
                        handleQuickLogin(pharmUser);
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black text-xs py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'دخول كصيدلي' : 'Login as Pharm'}</span>
                    </button>
                  </div>

                  {/* Option 3: Cashier */}
                  <div className="bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 rounded-xl p-3 flex flex-col justify-between space-y-2 transition shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          💳 كاشير مبيعات
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">PIN: 4455</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-2">د. فهد الغامدي</h4>
                      <p className="text-[10px] text-sky-200/80 mt-0.5">
                        {isAr ? 'مبيعات فقط (محجوب الخصم والتقارير المحاسبية)' : 'Sales POS only, strict limits'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cashierUser = pharmacists.find((p) => p.role === 'Cashier') || pharmacists[2] || pharmacists[0];
                        handleQuickLogin(cashierUser);
                      }}
                      className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-xs py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{isAr ? 'دخول ككاشير' : 'Login as Cashier'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: Google Sign-in */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition cursor-pointer shadow-sm text-xs sm:text-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {isGoogleLoading ? (isAr ? 'جاري التحقق عبر Google...' : 'Connecting...') : (isAr ? 'تسجيل دخول سريع بحساب Google (المالك)' : 'Sign In with Google Account')}
                  </span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {isAr ? 'أو الدخول اليدوي برمز المرور (PIN)' : 'Or Manual Staff PIN'}
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Manual Login Form */}
              <form onSubmit={handleExecuteLogin} className="space-y-4 text-xs sm:text-sm">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Account Selection Cards */}
                <div>
                  <label className="text-slate-300 block font-bold mb-2">
                    {isAr ? 'اختر الحساب المطلوب تسجيل الدخول به:' : 'Select Account:'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pharmacists.map((pharm) => {
                      const isSelected = selectedUserId === pharm.id;
                      const isAdmin = pharm.role === 'Admin';

                      return (
                        <div
                          key={pharm.id}
                          onClick={() => {
                            setSelectedUserId(pharm.id);
                            setPinInput('');
                            setLoginError('');
                          }}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-teal-500 bg-teal-950/40 shadow-sm ring-1 ring-teal-500'
                              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            }`}>
                              {isAdmin ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-white">
                                {pharm.nameAr}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{pharm.username} • {pharm.licenseNumber}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            }`}>
                              {isAdmin ? (isAr ? '👑 مدير النظام' : 'Admin') : pharm.role === 'Pharmacist' ? (isAr ? '👨‍⚕️ صيدلي' : 'Pharmacist') : (isAr ? '💳 كاشير' : 'Cashier')}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PIN Input Box */}
                {selectedPharmacist && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-bold block">
                        {isAr ? 'رمز المرور السريع (PIN):' : 'Enter PIN Code:'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setPinInput(selectedPharmacist.pin)}
                        className="text-xs text-teal-400 hover:underline cursor-pointer font-bold"
                      >
                        {isAr ? `تعبئة الرمز التلقائي (${selectedPharmacist.pin})` : 'Auto-fill PIN'}
                      </button>
                    </div>

                    <input
                      type="password"
                      maxLength={8}
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-center font-mono text-2xl tracking-widest text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد الدخول واعتماد الصلاحيات' : 'Confirm Login & Permissions'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: REGISTER (NEW PHARMACY OR STAFF)                                    */}
          {/* ========================================================================= */}
          {activeTab === 'register' && (
            <div className="space-y-5 text-xs sm:text-sm">
              
              {/* Type Switcher: New Pharmacy SaaS Client vs Staff */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setRegisterType('pharmacy')}
                  className={`py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    registerType === 'pharmacy'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل صيدلية جديدة واشتراك' : 'New Pharmacy Client'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterType('staff')}
                  className={`py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    registerType === 'staff'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة موظف / صيدلي' : 'New Staff Member'}</span>
                </button>
              </div>

              {/* Form 1: New Pharmacy Client Registration */}
              {registerType === 'pharmacy' && (
                <form onSubmit={handleExecutePharmacyRegister} className="space-y-4">
                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {/* Plan Selection */}
                  <div className="space-y-2">
                    <label className="text-slate-300 font-bold block">
                      {isAr ? 'اختر خطة الاشتراك والترخيص للصيدلية:' : 'Subscription Plan:'}
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'Monthly', title: '📅 شهري', price: '99 SAR / 299 EGP', desc: 'دفع شهري مرن' },
                        { id: 'Annual', title: '🗓️ سنوي', price: '899 SAR / 2,499 EGP', desc: 'خصم 25% + شهرين' },
                        { id: 'LifetimeCash', title: '💎 كاش للأبد', price: '2,400 SAR / 5,999 EGP', desc: 'ترخيص كاش دائم' },
                      ].map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setChosenCycle(p.id as BillingCycle)}
                          className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                            chosenCycle === p.id
                              ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold ring-2 ring-indigo-500/30'
                              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div className="font-black text-xs">{p.title}</div>
                          <div className="text-[10px] text-indigo-400 font-mono font-bold mt-1">{p.price}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      {isAr ? 'اسم الصيدلية:' : 'Pharmacy Name:'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="صيدلية النور الحديثة"
                      value={newPharmName}
                      onChange={(e) => {
                        setNewPharmName(e.target.value);
                        if (!newSubdomain) setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'اسم المالك / المدير:' : 'Owner Name:'} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="د. حسام الشريف"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'رقم الهاتف / الواتساب:' : 'Phone Number:'} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0500000000"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'طريقة السداد / الدفع:' : 'Payment Gateway:'}
                      </label>
                      <select
                        value={chosenPaymentMethod}
                        onChange={(e) => setChosenPaymentMethod(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="CreditCard">بطاقة بنكية / فيزا / مدى (Stripe)</option>
                        <option value="VodafoneCash">فوري باي (Fawry Pay كود 788)</option>
                        <option value="VodafoneCash">فودافون كاش / إنستاباي</option>
                        <option value="Cash">سداد نقدي مباشر (Cash)</option>
                        <option value="BankTransfer">تحويل بنكي رسمي (IBAN)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'العملة المفضلة:' : 'Currency:'}
                      </label>
                      <select
                        value={chosenCurrency}
                        onChange={(e) => setChosenCurrency(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="EGP">جنيه مصري (EGP)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span>{isAr ? 'تأكيد التسجيل والدخول كمدير صيدلية' : 'Register & Login as Manager'}</span>
                  </button>
                </form>
              )}

              {/* Form 2: New Staff Member Registration */}
              {registerType === 'staff' && (
                <form onSubmit={handleExecuteStaffRegister} className="space-y-4">
                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      {isAr ? 'اسم الموظف الرباعي:' : 'Employee Full Name:'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="د. مصطفى كمال"
                      value={regNameAr}
                      onChange={(e) => setRegNameAr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'الدور الوظيفي والصلاحيات:' : 'Role:'}
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-teal-500"
                      >
                        <option value="Pharmacist">صيدلي مناوب (Pharmacist)</option>
                        <option value="Cashier">كاشير مبيعات (Cashier)</option>
                        <option value="ShiftSupervisor">مشرف شيفت (Supervisor)</option>
                        <option value="Admin">مدير فرع / مالك (Admin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'رمز المرور (PIN):' : 'PIN Code:'} *
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        required
                        placeholder="1234"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-center text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'اسم المستخدم:' : 'Username:'}
                      </label>
                      <input
                        type="text"
                        placeholder="mustafa"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        {isAr ? 'رقم الهاتف:' : 'Phone:'}
                      </label>
                      <input
                        type="text"
                        placeholder="0500000000"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAr ? 'حفظ الموظف وتفعيل حسابه فوراً' : 'Save & Activate Staff Account'}</span>
                  </button>
                </form>
              )}

            </div>
          )}

        </div>

        {/* Right Column: Roles & Permissions Matrix Explainer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Comparison Matrix Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <ShieldAlert className="w-5 h-5 text-teal-400" />
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">
                  {isAr ? 'مصفوفة تفعيل الصلاحيات (المدير مقابل الموظف)' : 'Role Permissions Matrix'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'الفروقات الجوهرية المطبقة أمنياً داخل النظام' : 'Strict RBAC security separation'}
                </p>
              </div>
            </div>

            {/* Matrix comparison table */}
            <div className="space-y-2 text-xs">
              {[
                {
                  feature: isAr ? 'لوحة المالك والاشتراكات السحابية (Owner Suite)' : 'Owner Suite & SaaS Portal',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'محجوبة تماماً عن الموظف والكاشير' : 'Hidden from employees',
                },
                {
                  feature: isAr ? 'متابعة العملاء والاشتراكات (Clients CRM)' : 'Clients CRM & Subscriptions',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'محجوبة وتختفي من شريط التنقل للموظف' : 'Admin only tab',
                },
                {
                  feature: isAr ? 'استعراض أسعار الشراء وهوامش الربح' : 'Wholesale Costs & Profit Margins',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'تظهر للموظف مشفرة (••••) بحماية أمنية' : 'Masked with lock for staff',
                },
                {
                  feature: isAr ? 'تقفيل اليومية والمطابقة Z-Report' : 'Daily Z-Report Audit Closing',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'الموظف يقفل شيفته فقط، واليومية للمدير' : 'Z-Report restricted to manager',
                },
                {
                  feature: isAr ? 'تعديل أسعار الأدوية وإضافة أصناف' : 'Modify Selling Prices & Add Meds',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'محمي ضد تلاعب الموظفين بالأسعار' : 'Protected against unauthorized edits',
                },
                {
                  feature: isAr ? 'صلاحية الخصومات الإضافية' : 'Discount Authorization Limit',
                  admin: true,
                  staff: false,
                  desc: isAr ? 'المدير حتى 25%، الصيدلي 10%، الكاشير 0%' : 'Tiered discount permissions',
                },
                {
                  feature: isAr ? 'نقطة البيع السريعة FEFO وصرف الأدوية' : 'Fast FEFO POS & Dispensing',
                  admin: true,
                  staff: true,
                  desc: isAr ? 'متاح للجميع للبيع وصرف الفواتير' : 'Available for all operational staff',
                },
              ].map((row, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{row.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        row.admin ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        👑 {row.admin ? 'متاح' : 'لا'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        row.staff ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        👨‍⚕️ {row.staff ? 'متاح' : 'محجوب 🔒'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">{row.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick Demo summary note */}
            <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-2xl text-[11px] text-teal-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-teal-300">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>كيف تختبر الصلاحيات الآن؟</span>
              </span>
              <p className="leading-relaxed text-teal-300/80">
                {isAr
                  ? 'اضغط زر "دخول كمدير" لتشاهد كافة التبويبات وأسعار الشراء، ثم اضغط زر "دخول كصيدلي" لتشاهد اختفاء لوحة المالك والعملاء وتشفير التكلفة فوراً!'
                  : 'Click "Login as Admin" to see Owner Suite and profits, then switch to "Pharmacist" to verify immediate hiding of protected modules.'}
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/40 text-center py-4 text-xs text-slate-500">
        PharmaCore Enterprise Cloud • Secure Multi-Tenant Architecture • Role-Based Access Control
      </footer>
    </div>
  );
};
