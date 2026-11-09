import React, { useState } from 'react';
import { PharmacistUser, SaaSClient, BillingCycle } from '../types/pharmacy';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiClient } from '../services/apiClient';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Key, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  X,
  AlertCircle,
  Building2,
  Sparkles,
  Calendar,
  Gem,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { getPharmacyClientUrl } from '../services/appUrlHelper';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PharmacistUser | null;
  pharmacists: PharmacistUser[];
  onLogin: (user: PharmacistUser) => void;
  onRegisterStaff: (newUser: PharmacistUser) => void;
  onRegisterPharmacyClient?: (client: SaaSClient) => void;
  lang: 'ar' | 'en';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  pharmacists,
  onLogin,
  onRegisterStaff,
  onRegisterPharmacyClient,
  lang,
}) => {
  if (!isOpen) return null;

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
  const [chosenPaymentMethod, setChosenPaymentMethod] = useState<'Cash' | 'BankTransfer' | 'VodafoneCash' | 'CreditCard'>('Cash');
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
          pin: '0000',
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
      onClose();
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
    onClose();
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
      endDate = '2099-12-31'; // Lifetime Cash
      price = chosenCurrency === 'EGP' ? 5999 : 2400;
    }

    // 1. Create client record
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
      notes: `تم التسجيل عبر البوابة - ${chosenCycle === 'LifetimeCash' ? 'شراء كاش مدى الحياة' : chosenCycle === 'Annual' ? 'اشتراك سنوي' : 'اشتراك شهري'}`,
    };

    if (onRegisterPharmacyClient) {
      onRegisterPharmacyClient(newClient);
    }

    // 2. Create matching Admin account for this owner
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
    onClose();
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 rtl:left-auto rtl:right-4 text-slate-300 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isAr ? 'بوابة الدخول والاشتراك في المنظومة' : 'Login & Registration Portal'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr ? 'تسجيل دخول الصيادلة أو فتح حساب صيدلية باشتراك سحابي' : 'Role-Based Access & SaaS Onboarding'}
              </p>
            </div>
          </div>

          {/* Toggle between Login and Register */}
          <div className="flex gap-2 mt-5 p-1 bg-white/10 rounded-xl backdrop-blur-xs">
            <button
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setRegError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل جديد واشتراك' : 'New Account'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* ========================================================================= */}
          {/* TAB 1: LOGIN                                                              */}
          {/* ========================================================================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleExecuteLogin} className="space-y-4 text-xs">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Google Sign In Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {isGoogleLoading ? (isAr ? 'جاري التحقق...' : 'Connecting...') : (isAr ? 'دخول فوري بحساب Google (المالك العام)' : 'Sign in with Google')}
                  </span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isAr ? 'أو دخول بالرمز السريع (PIN)' : 'Or Staff Quick PIN'}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Staff User Selector Cards */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block font-bold mb-2">
                  {isAr ? 'اختر حساب الموظف للدخول:' : 'Select Account:'}
                </label>
                <div className="space-y-2">
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
                            ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 shadow-xs ring-2 ring-teal-600/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isAdmin ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {pharm.nameAr}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              @{pharm.username}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-teal-500/10 text-teal-600'
                        }`}>
                          {isAdmin ? (isAr ? 'مدير / مالك' : 'Admin') : pharm.role === 'Pharmacist' ? (isAr ? 'صيدلي' : 'Pharmacist') : (isAr ? 'كاشير' : 'Cashier')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PIN input */}
              {selectedPharmacist && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-slate-700 dark:text-slate-300 font-bold block flex items-center justify-between">
                    <span>{isAr ? 'أدخل رمز المرور السريع (PIN):' : 'Enter PIN:'}</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {isAr ? `للحساب: ${selectedPharmacist.nameAr}` : selectedPharmacist.username}
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type="password"
                      maxLength={8}
                      autoFocus
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setPinInput(selectedPharmacist.pin)}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
                    >
                      {isAr ? `تعبئة الرمز التلقائي (${selectedPharmacist.pin})` : 'Auto-fill PIN'}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm py-3 rounded-2xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول واعتماد الصلاحيات' : 'Confirm Login'}</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: REGISTER (PHARMACY CLIENT WITH PLANS OR STAFF)                     */}
          {/* ========================================================================= */}
          {activeTab === 'register' && (
            <div className="space-y-4 text-xs">
              
              {/* Type Switcher: New Pharmacy vs Staff */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegisterType('pharmacy')}
                  className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    registerType === 'pharmacy' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تسجيل صيدلية جديدة واشتراك' : 'New Pharmacy Client'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterType('staff')}
                  className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    registerType === 'staff' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة موظف صيدلي' : 'New Staff'}</span>
                </button>
              </div>

              {/* Form 1: New Pharmacy Client Registration with Billing Plans */}
              {registerType === 'pharmacy' && (
                <form onSubmit={handleExecutePharmacyRegister} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 block font-bold">
                      اختر خطة الاشتراك والترخيص للصيدلية: *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Monthly', title: '📅 شهري', price: '99 SAR / 299 EGP', desc: 'دفع شهري مرن' },
                        { id: 'Annual', title: '🗓️ سنوي', price: '899 SAR / 2,499 EGP', desc: 'خصم 25% + شهرين' },
                        { id: 'LifetimeCash', title: '💎 كاش للأبد', price: '2,400 SAR / 5,999 EGP', desc: 'ترخيص كاش دائم' },
                      ].map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setChosenCycle(p.id as BillingCycle)}
                          className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                            chosenCycle === p.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-black">{p.title}</div>
                          <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono font-bold mt-0.5">{p.price}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      اسم الصيدلية: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: صيدلية الأمل الحديثة"
                      value={newPharmName}
                      onChange={(e) => {
                        setNewPharmName(e.target.value);
                        if (!newSubdomain) setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        اسم المالك / المدير: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="د. حسام الشريف"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        رقم الهاتف / الواتساب: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0500000000"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        طريقة السداد:
                      </label>
                      <select
                        value={chosenPaymentMethod}
                        onChange={(e) => setChosenPaymentMethod(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="CreditCard">بطاقة بنكية / فيزا / مدى (Stripe)</option>
                        <option value="VodafoneCash">فوري باي (Fawry Pay كود 788)</option>
                        <option value="VodafoneCash">فودافون كاش / إنستاباي</option>
                        <option value="Cash">شراء كاش نقدي مباشر (Cash)</option>
                        <option value="BankTransfer">تحويل بنكي رسمي (IBAN)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        العملة المفضلة:
                      </label>
                      <select
                        value={chosenCurrency}
                        onChange={(e) => setChosenCurrency(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="EGP">جنيه مصري (EGP)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>توليد الرابط السحابي التلقائي:</span>
                    </span>
                    <p className="font-mono text-xs text-indigo-800 dark:text-indigo-300" dir="ltr">
                      {getPharmacyClientUrl(newSubdomain || 'pharmacy')}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 text-white font-black text-xs py-3 rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span>تأكيد تسجيل الصيدلية وتفعيل الاشتراك (Stripe / Fawry / Cash)</span>
                  </button>
                </form>
              )}

              {/* Form 2: New Staff Member Registration */}
              {registerType === 'staff' && (
                <form onSubmit={handleExecuteStaffRegister} className="space-y-3.5">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                      اسم الموظف الرباعي: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="د. مصطفى كمال"
                      value={regNameAr}
                      onChange={(e) => setRegNameAr(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        الدور الوظيفي:
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="Pharmacist">صيدلي مناوب (Pharmacist)</option>
                        <option value="Cashier">كاشير مبيعات (Cashier)</option>
                        <option value="ShiftSupervisor">مشرف شيفت (Supervisor)</option>
                        <option value="Admin">مدير فرع / مالك (Admin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        رمز المرور (PIN): *
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        required
                        placeholder="1234"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-center text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        اسم المستخدم (Username):
                      </label>
                      <input
                        type="text"
                        placeholder="mustafa"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block font-bold mb-1">
                        رقم الهاتف:
                      </label>
                      <input
                        type="text"
                        placeholder="0500000000"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm py-3 rounded-2xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>تسجيل الموظف والبدء فوراً</span>
                  </button>
                </form>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
