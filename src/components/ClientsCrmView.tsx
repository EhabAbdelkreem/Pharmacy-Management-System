import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  Printer, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Phone, 
  Mail, 
  Building2, 
  DollarSign, 
  Sparkles, 
  Gem, 
  MessageCircle,
  Copy,
  Check,
  CreditCard,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Share2,
  X
} from 'lucide-react';
import { SaaSClient, BillingCycle, ClientSubscriptionStatus, PricingPlanOption } from '../types/pharmacy';
import { PRICING_PLANS } from '../data/mockData';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';
import { getPharmacyClientUrl, copyTextSafely } from '../services/appUrlHelper';

interface ClientsCrmViewProps {
  clients: SaaSClient[];
  onSaveClient: (client: SaaSClient) => void;
  onDeleteClient: (id: string) => void;
  lang: 'ar' | 'en';
}

export const ClientsCrmView: React.FC<ClientsCrmViewProps> = ({
  clients,
  onSaveClient,
  onDeleteClient,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'plans' | 'collections'>('clients');
  const [filterCycle, setFilterCycle] = useState<'all' | BillingCycle | 'expiring'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<SaaSClient | null>(null);
  const [activeReceiptClient, setActiveReceiptClient] = useState<SaaSClient | null>(null);
  const [renewingClient, setRenewingClient] = useState<SaaSClient | null>(null);
  const [checkoutClient, setCheckoutClient] = useState<SaaSClient | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Client Form State
  const [pharmacyName, setPharmacyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Annual');
  const [priceAmount, setPriceAmount] = useState<number>(899);
  const [currency, setCurrency] = useState<'SAR' | 'EGP'>('SAR');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'BankTransfer' | 'VodafoneCash' | 'CreditCard'>('Cash');
  const [branchesAllowed, setBranchesAllowed] = useState(1);
  const [notes, setNotes] = useState('');

  // Plans price state
  const [plans, setPlans] = useState<PricingPlanOption[]>(PRICING_PLANS);

  // Quick stats
  const totalClients = clients.length;
  const activeCount = clients.filter((c) => c.status === 'Active').length;
  const lifetimeCount = clients.filter((c) => c.billingCycle === 'LifetimeCash').length;
  const monthlyCount = clients.filter((c) => c.billingCycle === 'Monthly').length;
  const annualCount = clients.filter((c) => c.billingCycle === 'Annual').length;

  // Revenue totals
  const totalLifetimeCashCollected = clients
    .filter((c) => c.billingCycle === 'LifetimeCash')
    .reduce((sum, c) => sum + c.priceAmount, 0);

  const monthlyMRR = clients
    .filter((c) => c.billingCycle === 'Monthly' && c.status === 'Active')
    .reduce((sum, c) => sum + c.priceAmount, 0);

  const annualARR = clients
    .filter((c) => c.billingCycle === 'Annual' && c.status === 'Active')
    .reduce((sum, c) => sum + c.priceAmount, 0);

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch = 
      c.pharmacyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.subdomain.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCycle === 'all') return true;
    if (filterCycle === 'expiring') {
      return c.status === 'PendingRenewal';
    }
    return c.billingCycle === filterCycle;
  });

  const getRealClientLink = (sub: string) => {
    return getPharmacyClientUrl(sub);
  };

  const handleCopyLink = async (sub: string, id: string) => {
    const link = getRealClientLink(sub);
    const ok = await copyTextSafely(link);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleShareMobile = async (client: SaaSClient) => {
    const link = getRealClientLink(client.subdomain);
    const title = `PharmaCore - صيدلية ${client.pharmacyName}`;
    const text = `رابط الدخول المباشر لنظام PharmaCore الخاص بصيدلية ${client.pharmacyName}: ${link}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyLink(client.subdomain, client.id);
  };

  const handleOpenWhatsApp = (client: SaaSClient) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const link = getRealClientLink(client.subdomain);
    let message = '';
    if (client.billingCycle === 'LifetimeCash') {
      message = `أهلاً د. ${client.ownerName}، تم تفعيل ترخيص الشراء كاش مدى الحياة لصيدلية (${client.pharmacyName}) بنجاح. رابطك الفعلي المباشر للدخول: ${link}`;
    } else {
      message = `أهلاً د. ${client.ownerName}، رابط نظام PharmaCore لصيدلية (${client.pharmacyName}) هو: ${link}. اشتراكك الحالي ينتهي بتاريخ ${client.endDate || ''}.`;
    }
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const anchor = document.createElement('a');
    anchor.href = whatsappUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleSaveNewClient = () => {
    if (!pharmacyName || !ownerName || !subdomain) return;

    const startDate = new Date().toISOString().split('T')[0];
    let endDate = '';
    const now = new Date();

    if (billingCycle === 'Monthly') {
      now.setMonth(now.getMonth() + 1);
      endDate = now.toISOString().split('T')[0];
    } else if (billingCycle === 'Annual') {
      now.setFullYear(now.getFullYear() + 1);
      endDate = now.toISOString().split('T')[0];
    } else {
      endDate = '2099-12-31'; // Lifetime Cash
    }

    const newClient: SaaSClient = {
      id: `cli-${Date.now()}`,
      pharmacyName,
      ownerName,
      phone: phone || '+966 50 000 0000',
      email: email || undefined,
      city: city || undefined,
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      billingCycle,
      priceAmount: Number(priceAmount) || 0,
      currency,
      paymentMethod,
      status: 'Active',
      startDate,
      endDate,
      branchesAllowed,
      notes: notes || undefined,
    };

    onSaveClient(newClient);
    setShowAddClientModal(false);
    // Reset form
    setPharmacyName('');
    setOwnerName('');
    setPhone('');
    setEmail('');
    setCity('');
    setSubdomain('');
    setNotes('');
  };

  const handleRenewClient = (client: SaaSClient, newCycle: BillingCycle) => {
    const now = new Date();
    let endDate = '';
    let price = 0;

    if (newCycle === 'Monthly') {
      now.setMonth(now.getMonth() + 1);
      endDate = now.toISOString().split('T')[0];
      price = client.currency === 'EGP' ? 299 : 99;
    } else if (newCycle === 'Annual') {
      now.setFullYear(now.getFullYear() + 1);
      endDate = now.toISOString().split('T')[0];
      price = client.currency === 'EGP' ? 2499 : 899;
    } else {
      endDate = '2099-12-31';
      price = client.currency === 'EGP' ? 5999 : 2400;
    }

    const updatedClient: SaaSClient = {
      ...client,
      billingCycle: newCycle,
      status: 'Active',
      startDate: new Date().toISOString().split('T')[0],
      endDate,
      priceAmount: price,
      notes: (client.notes ? client.notes + ' | ' : '') + `تم التجديد بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
    };

    onSaveClient(updatedClient);
    setRenewingClient(null);
  };

  const handleToggleStatus = (client: SaaSClient) => {
    const newStatus: ClientSubscriptionStatus = client.status === 'Active' ? 'Expired' : 'Active';
    onSaveClient({ ...client, status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in">
      
      {/* Super Admin Top Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>لوحة مالك النظام السحابي (SaaS Super Admin CRM)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              متابعة عملاء الصيدليات، الاشتراكات، والتحصيل الكاش
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              تحكم كامل في بيع البرنامج للصيدليات: إدارة تراخيص الشراء كاش، تجديد الاشتراكات الشهرية والسنوية، وإرسال روابط التشغيل الفورية للعملاء.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setBillingCycle('Annual');
                setPriceAmount(currency === 'EGP' ? 2499 : 899);
                setShowAddClientModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صيدلية / عميل جديد</span>
            </button>
          </div>
        </div>

        {/* Financial & Subscription Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>إجمالي الصيدليات المشتركة</span>
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{totalClients}</div>
            <div className="text-[10px] text-teal-400 mt-0.5">منها {activeCount} صيدلية نشطة حالياً</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5 text-amber-400" />
              <span>مبيعات الكاش مدى الحياة</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
              {totalLifetimeCashCollected.toLocaleString()} {clients[0]?.currency || 'SAR'}
            </div>
            <div className="text-[10px] text-amber-200 mt-0.5">{lifetimeCount} تراخيص شراء كاش نهائي</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>الإيراد الشهري المتكرر (MRR)</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-1 font-mono">
              {monthlyMRR.toLocaleString()} {clients[0]?.currency || 'SAR'}
            </div>
            <div className="text-[10px] text-indigo-200 mt-0.5">من {monthlyCount} اشتراك شهري نشط</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>الإيراد السنوي المتكرر (ARR)</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
              {annualARR.toLocaleString()} {clients[0]?.currency || 'SAR'}
            </div>
            <div className="text-[10px] text-emerald-200 mt-0.5">من {annualCount} صيدلية باقة سنوية</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'clients'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>قائمة الصيدليات والعملاء ({totalClients})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('plans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'plans'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>ضبط وتعديل باقات الاشتراك (شهري / سنوي / كاش)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CLIENTS CRM DIRECTORY & MONITORING                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث باسم الصيدلية، اسم المالك، الهاتف، أو الرابط..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setFilterCycle('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCycle === 'all'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الكل ({totalClients})
              </button>

              <button
                onClick={() => setFilterCycle('Monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCycle === 'Monthly'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                }`}
              >
                📅 شهري ({monthlyCount})
              </button>

              <button
                onClick={() => setFilterCycle('Annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCycle === 'Annual'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                🗓️ سنوي ({annualCount})
              </button>

              <button
                onClick={() => setFilterCycle('LifetimeCash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCycle === 'LifetimeCash'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                }`}
              >
                💎 كاش مدى الحياة ({lifetimeCount})
              </button>

              <button
                onClick={() => setFilterCycle('expiring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCycle === 'expiring'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                ⚠️ قرب التجديد ({clients.filter((c) => c.status === 'PendingRenewal').length})
              </button>
            </div>
          </div>

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const isLifetime = client.billingCycle === 'LifetimeCash';
              const isMonthly = client.billingCycle === 'Monthly';
              const isAnnual = client.billingCycle === 'Annual';

              return (
                <div 
                  key={client.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  {/* Card Header: Pharmacy & Plan Badge */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs text-white ${
                          isLifetime 
                            ? 'bg-gradient-to-br from-amber-500 to-amber-700' 
                            : isAnnual 
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            : 'bg-gradient-to-br from-indigo-600 to-blue-700'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            {client.pharmacyName}
                          </h3>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {client.ownerName} • {client.city || 'الفرع الرئيسي'}
                          </div>
                        </div>
                      </div>

                      {/* Status & Plan Pill */}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        isLifetime 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : isAnnual
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                      }`}>
                        {isLifetime ? '💎 كاش للأبد' : isAnnual ? '🗓️ سنوي' : '📅 شهري'}
                      </span>
                    </div>

                    {/* Subscription Details Box */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">قيمة الاشتراك / الشراء:</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {client.priceAmount.toLocaleString()} {client.currency}
                          <span className="text-[10px] font-normal text-slate-400 mr-1">
                            ({client.paymentMethod === 'Cash' ? 'كاش نقدي' : client.paymentMethod === 'VodafoneCash' ? 'فودافون كاش' : client.paymentMethod === 'BankTransfer' ? 'تحويل بنكي' : 'فيزا'})
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">تاريخ التجديد القادم:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {isLifetime ? 'مدى الحياة (لا ينتهي)' : client.endDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">حالة الترخيص:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                          client.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : client.status === 'PendingRenewal'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {client.status === 'Active' ? '✓ نشط ومفعل' : client.status === 'PendingRenewal' ? '⚠️ قرب التجديد' : '✕ متوقف'}
                        </span>
                      </div>
                    </div>

                    {/* Client Subdomain Public Working Link */}
                    <div className="p-2.5 bg-slate-100/90 dark:bg-slate-800/60 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">{isAr ? 'رابط الدخول المباشر للعميل (مفعل للهواتف):' : 'Client Mobile Link:'}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ رابط عام نشط</span>
                      </div>
                      <a
                        href={getRealClientLink(client.subdomain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-teal-700 dark:text-teal-300 font-mono font-bold text-xs hover:underline bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-200 dark:border-teal-800/80 shadow-2xs"
                        title={getRealClientLink(client.subdomain)}
                      >
                        {getRealClientLink(client.subdomain)}
                      </a>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Open in new tab */}
                        <a
                          href={getRealClientLink(client.subdomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isAr ? 'فتح الرابط' : 'Open'}</span>
                        </a>

                        {/* Mobile Native Share */}
                        <button
                          type="button"
                          onClick={() => handleShareMobile(client)}
                          className="flex items-center gap-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                          title={isAr ? 'مشاركة الرابط مع العميل عبر تطبيقات الهاتف' : 'Share link'}
                        >
                          <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{isAr ? 'مشاركة' : 'Share'}</span>
                        </button>

                        {/* Safe Copy */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(client.subdomain, client.id)}
                          className="flex items-center gap-1 text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                          title="نسخ الرابط للحافظة"
                        >
                          {copiedId === client.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-300">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                              <span>{isAr ? 'نسخ' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {client.notes && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/40 dark:border-amber-900/40">
                        "{client.notes}"
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp message trigger */}
                      <button
                        onClick={() => handleOpenWhatsApp(client)}
                        className="flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                        title="تواصل مباشر عبر الواتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </button>

                      {/* Print license receipt */}
                      <button
                        onClick={() => setActiveReceiptClient(client)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="طباعة إيصال وفاتورة الاشتراك"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggleStatus(client)}
                        className={`text-[10px] px-2 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                          client.status === 'Active'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                        title={client.status === 'Active' ? 'تجميد الحساب' : 'إعادة التنشيط'}
                      >
                        {client.status === 'Active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Renew button */}
                      {!isLifetime && (
                        <button
                          onClick={() => setRenewingClient(client)}
                          className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>تجديد</span>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف اشتراك صيدلية (${client.pharmacyName})؟`)) {
                            onDeleteClient(client.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="حذف العميل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PRICING PACKAGES & BILLING MODEL (MONTHLY / ANNUAL / CASH)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              باقات ونماذج الاشتراك والبيع للصيدليات
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يمكنك ضبط وتعديل تسعيرة الاشتراك الشهري، السنوي، أو شراء الترخيص كاش نقدي لمرة واحدة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {plans.map((plan) => {
              const isLifetime = plan.id === 'LifetimeCash';
              const isAnnual = plan.id === 'Annual';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 border-2 ${
                    isAnnual
                      ? 'bg-gradient-to-b from-emerald-50/60 to-white dark:from-slate-900 dark:to-slate-950 border-emerald-500 shadow-xl'
                      : isLifetime
                      ? 'bg-gradient-to-b from-amber-50/60 to-white dark:from-slate-900 dark:to-slate-950 border-amber-500 shadow-xl'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  {plan.badgeAr && (
                    <div className="absolute -top-3.5 right-6">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm text-white ${
                        isAnnual ? 'bg-emerald-600' : isLifetime ? 'bg-amber-600' : 'bg-indigo-600'
                      }`}>
                        {plan.badgeAr}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {isLifetime ? <Gem className="w-5 h-5 text-amber-500" /> : <Calendar className="w-5 h-5 text-emerald-600" />}
                        <span>{plan.titleAr}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {plan.descriptionAr}
                      </p>
                    </div>

                    {/* Price display with SAR & EGP */}
                    <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {plan.priceSAR}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          ريال سعودي / {plan.periodAr}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                        أو {plan.priceEGP.toLocaleString()} جنيه مصري / {plan.periodAr}
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        المزايا المشمولة في الباقة:
                      </div>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {plan.featuresAr.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setBillingCycle(plan.id);
                        setPriceAmount(plan.priceSAR);
                        setShowAddClientModal(true);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                        isAnnual
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : isLifetime
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>تسجيل عميل جديد على هذه الباقة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PHARMACY CLIENT                                            */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    تسجيل صيدلية جديدة وتفعيل الاشتراك
                  </h3>
                  <p className="text-xs text-white/70">
                    إصدار رابط خاص بقاعدة بيانات سحابية Cloud SQL فوراً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Plan Selector */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1.5">
                  نوع خطة الاشتراك والدفع: *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Monthly', title: '📅 شهري', desc: '99 ريال / 299 ج' },
                    { id: 'Annual', title: '🗓️ سنوي', desc: '899 ريال / 2499 ج' },
                    { id: 'LifetimeCash', title: '💎 كاش للأبد', desc: '2400 ريال / 5999 ج' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const cycle = p.id as BillingCycle;
                        setBillingCycle(cycle);
                        if (cycle === 'Monthly') setPriceAmount(currency === 'EGP' ? 299 : 99);
                        if (cycle === 'Annual') setPriceAmount(currency === 'EGP' ? 2499 : 899);
                        if (cycle === 'LifetimeCash') setPriceAmount(currency === 'EGP' ? 5999 : 2400);
                      }}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        billingCycle === p.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pharmacy & Owner info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    اسم الصيدلية: *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: صيدليات المروة الحديثة"
                    value={pharmacyName}
                    onChange={(e) => {
                      setPharmacyName(e.target.value);
                      if (!subdomain) {
                        setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    اسم المالك / المدير الصيدلي: *
                  </label>
                  <input
                    type="text"
                    placeholder="د. أحمد مصطفى"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Phone & Subdomain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    رقم الهاتف / الواتساب: *
                  </label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000 أو 050..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    المعرف في الرابط (Subdomain): *
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5">
                    <input
                      type="text"
                      placeholder="almarwa"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-transparent p-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">.pharmacore.cloud</span>
                  </div>
                </div>
              </div>

              {/* Price, Currency & Payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    المبلغ المحصل:
                  </label>
                  <input
                    type="number"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    العملة:
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const cur = e.target.value as 'SAR' | 'EGP';
                      setCurrency(cur);
                      if (billingCycle === 'Monthly') setPriceAmount(cur === 'EGP' ? 299 : 99);
                      if (billingCycle === 'Annual') setPriceAmount(cur === 'EGP' ? 2499 : 899);
                      if (billingCycle === 'LifetimeCash') setPriceAmount(cur === 'EGP' ? 5999 : 2400);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                    طريقة الدفع:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Cash">كاش نقدي (Cash)</option>
                    <option value="VodafoneCash">فودافون كاش / إنستاباي</option>
                    <option value="BankTransfer">تحويل بنكي</option>
                    <option value="CreditCard">فيزا / مدى (بطاقة)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block font-bold mb-1">
                  ملاحظات إضافية على العميل:
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات حول طريقة السداد، عدد الفروع، أو تاريخ التواصل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveNewClient}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md transition cursor-pointer"
              >
                تأكيد وتسجيل الصيدلية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RENEW SUBSCRIPTION                                                 */}
      {/* ========================================================================= */}
      {renewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <span>تجديد اشتراك: {renewingClient.pharmacyName}</span>
              </h3>
              <button onClick={() => setRenewingClient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              اختر مدة التجديد المناسبة للعميل د. {renewingClient.ownerName}:
            </p>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleRenewClient(renewingClient, 'Monthly')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-right flex items-center justify-between transition cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">تجديد شهر واحد (Monthly)</div>
                  <div className="text-[10px] text-slate-500">يمدد الصلاحية لشهر كامل قادم</div>
                </div>
                <span className="font-mono font-bold text-indigo-600">
                  {renewingClient.currency === 'EGP' ? '299 EGP' : '99 SAR'}
                </span>
              </button>

              <button
                onClick={() => handleRenewClient(renewingClient, 'Annual')}
                className="w-full p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 text-right flex items-center justify-between transition cursor-pointer"
              >
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">تجديد سنة كاملة (Annual) ★</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">خصم 25% + دعم فني متواصل</div>
                </div>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {renewingClient.currency === 'EGP' ? '2,499 EGP' : '899 SAR'}
                </span>
              </button>

              <button
                onClick={() => handleRenewClient(renewingClient, 'LifetimeCash')}
                className="w-full p-3 rounded-2xl border border-amber-300 dark:border-amber-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/40 text-right flex items-center justify-between transition cursor-pointer"
              >
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200">ترقية إلى شراء كاش مدى الحياة 💎</div>
                  <div className="text-[10px] text-slate-500">ترخيص دائم للأبد دون أي فواتير مستقبلية</div>
                </div>
                <span className="font-mono font-bold text-amber-600">
                  {renewingClient.currency === 'EGP' ? '5,999 EGP' : '2,400 SAR'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = renewingClient;
                  setRenewingClient(null);
                  setCheckoutClient(target);
                }}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-amber-300" />
                <span>فتح بوابة الدفع الإلكتروني لهذا العميل (Stripe / Fawry / Cash)</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRenewingClient(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL LICENSE & INVOICE RECEIPT                                 */}
      {/* ========================================================================= */}
      {activeReceiptClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 print:p-0 print:border-none print:shadow-none">
            
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>شهادة ترخيص وفاتورة اشتراك رسمية</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                منظومة PharmaCore لإدارة الصيدليات
              </h2>
              <p className="text-[11px] text-slate-500">
                رقم الترخيص: LIC-{activeReceiptClient.id.toUpperCase()}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الصيدلية:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeReceiptClient.pharmacyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المالك / المدير:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeReceiptClient.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span className="font-mono text-slate-900 dark:text-white">{activeReceiptClient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">خطة الترخيص:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {activeReceiptClient.billingCycle === 'LifetimeCash' ? 'شراء كاش مدى الحياة (ترخيص دائم للأبد)' : activeReceiptClient.billingCycle === 'Annual' ? 'اشتراك سنوي ذهبي' : 'اشتراك شهري مرن'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة السداد:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeReceiptClient.paymentMethod === 'Cash' ? 'كاش نقدي' : activeReceiptClient.paymentMethod === 'VodafoneCash' ? 'فودافون كاش / إنستاباي' : activeReceiptClient.paymentMethod === 'BankTransfer' ? 'تحويل بنكي' : 'بطاقة ائتمانية'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ بداية الترخيص:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{activeReceiptClient.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ الانتهاء / التجديد:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeReceiptClient.billingCycle === 'LifetimeCash' ? 'مدى الحياة (Lifetime License)' : activeReceiptClient.endDate}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
                <span className="text-slate-900 dark:text-white">المبلغ المدفوع:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {activeReceiptClient.priceAmount.toLocaleString()} {activeReceiptClient.currency}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 text-center font-medium">
              ✓ تم استلام القيمة وتسجيل الصيدلية على خوادم السحابة المشفرة Cloud SQL.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveReceiptClient(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الشهادة والإيصال</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Checkout Modal for Client */}
      {checkoutClient && (
        <SubscriptionCheckoutModal
          isOpen={!!checkoutClient}
          onClose={() => setCheckoutClient(null)}
          client={checkoutClient}
          defaultPlan={checkoutClient.billingCycle}
          defaultCurrency={checkoutClient.currency}
          onPaymentSuccess={(tx) => {
            const now = new Date();
            const startDate = now.toISOString().slice(0, 10);
            let endDate: string | undefined;

            if (tx.plan === 'Monthly') {
              const d = new Date(now);
              d.setMonth(d.getMonth() + 1);
              endDate = d.toISOString().slice(0, 10);
            } else if (tx.plan === 'Annual') {
              const d = new Date(now);
              d.setFullYear(d.getFullYear() + 1);
              endDate = d.toISOString().slice(0, 10);
            } else {
              endDate = '2099-12-31';
            }

            const updated: SaaSClient = {
              ...checkoutClient,
              billingCycle: tx.plan,
              priceAmount: tx.amount,
              currency: tx.currency,
              status: 'Active',
              startDate,
              endDate,
              paymentMethod: tx.gateway === 'stripe' ? 'CreditCard' : tx.gateway === 'fawry' || tx.gateway === 'vodafone_cash' ? 'VodafoneCash' : 'Cash',
              notes: tx.receiptNotes || checkoutClient.notes,
            };
            onSaveClient(updated);
            setCheckoutClient(null);
          }}
          lang={lang}
        />
      )}

    </div>
  );
};
