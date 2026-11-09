import React, { useState } from 'react';
import { 
  InsuranceContract, 
  InsuranceClaim, 
  PharmacySettings 
} from '../types/pharmacy';
import { 
  ShieldCheck, 
  Building2, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  Mail, 
  User, 
  DollarSign, 
  Percent, 
  FileSpreadsheet, 
  Printer, 
  X, 
  Edit3, 
  Check, 
  ArrowUpRight, 
  Calendar, 
  Layers, 
  CreditCard,
  Briefcase
} from 'lucide-react';

interface ContractsManagerProps {
  contracts: InsuranceContract[];
  claims: InsuranceClaim[];
  onAddContract: (contract: InsuranceContract) => void;
  onUpdateContract: (contract: InsuranceContract) => void;
  onUpdateClaimStatus: (claimId: string, newStatus: InsuranceClaim['status'], notes?: string) => void;
  onAddManualClaim?: (claim: InsuranceClaim) => void;
  settings: PharmacySettings;
  lang: 'ar' | 'en';
}

export const ContractsManager: React.FC<ContractsManagerProps> = ({
  contracts,
  claims,
  onAddContract,
  onUpdateContract,
  onUpdateClaimStatus,
  onAddManualClaim,
  settings,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Tabs: 'claims' (مطالبات التأمين) | 'partners' (جهات التعاقد)
  const [activeTab, setActiveTab] = useState<'claims' | 'partners'>('claims');

  // Filters for Claims
  const [claimSearch, setClaimSearch] = useState('');
  const [filterContract, setFilterContract] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'All' | InsuranceClaim['status']>('All');

  // Filters for Partners
  const [partnerSearch, setPartnerSearch] = useState('');

  // Modals state
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showBatchClaimModal, setShowBatchClaimModal] = useState(false);
  const [selectedPartnerForBatch, setSelectedPartnerForBatch] = useState<string>('All');
  const [editingContract, setEditingContract] = useState<InsuranceContract | null>(null);

  // New Contract Form State
  const [newContractCode, setNewContractCode] = useState('');
  const [newContractNameAr, setNewContractNameAr] = useState('');
  const [newContractNameEn, setNewContractNameEn] = useState('');
  const [newContractType, setNewContractType] = useState<InsuranceContract['type']>('Insurance');
  const [newCoPay, setNewCoPay] = useState('10');
  const [newMaxCap, setNewMaxCap] = useState('100');
  const [newLimit, setNewLimit] = useState('2000');
  const [newDiscount, setNewDiscount] = useState('5');
  const [newPhone, setNewPhone] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Financial Stats
  const totalClaimsAmount = claims.reduce((sum, c) => sum + c.claimAmount, 0);
  const pendingClaimsAmount = claims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.claimAmount, 0);
  const settledClaimsAmount = claims.filter(c => c.status === 'Settled').reduce((sum, c) => sum + c.claimAmount, 0);
  const totalPatientPaid = claims.reduce((sum, c) => sum + c.patientPaidAmount, 0);

  // Filtered Claims
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      c.patientName.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.cardNumber.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.claimNumber.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.invoiceNumber.toLowerCase().includes(claimSearch.toLowerCase());

    const matchesContract = filterContract === 'All' || c.contractId === filterContract;
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;

    return matchesSearch && matchesContract && matchesStatus;
  });

  // Filtered Partners
  const filteredPartners = contracts.filter(p => {
    return (
      p.nameAr.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(partnerSearch.toLowerCase())
    );
  });

  // Handle Save New or Edited Contract
  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractNameAr.trim() || !newContractCode.trim()) return;

    if (editingContract) {
      const updated: InsuranceContract = {
        ...editingContract,
        code: newContractCode.trim().toUpperCase(),
        nameAr: newContractNameAr.trim(),
        nameEn: newContractNameEn.trim() || newContractNameAr.trim(),
        type: newContractType,
        defaultCoPayPercent: parseFloat(newCoPay) || 0,
        maxCoPayCap: parseFloat(newMaxCap) || 0,
        prescriptionLimit: parseFloat(newLimit) || 0,
        discountPercent: parseFloat(newDiscount) || 0,
        phone: newPhone.trim(),
        contactPerson: newContact.trim(),
        email: newEmail.trim(),
        notes: newNotes.trim(),
      };
      onUpdateContract(updated);
      setEditingContract(null);
    } else {
      const created: InsuranceContract = {
        id: `cnt-${Date.now()}`,
        code: newContractCode.trim().toUpperCase(),
        nameAr: newContractNameAr.trim(),
        nameEn: newContractNameEn.trim() || newContractNameAr.trim(),
        type: newContractType,
        defaultCoPayPercent: parseFloat(newCoPay) || 0,
        maxCoPayCap: parseFloat(newMaxCap) || 0,
        prescriptionLimit: parseFloat(newLimit) || 0,
        discountPercent: parseFloat(newDiscount) || 0,
        status: 'Active',
        phone: newPhone.trim(),
        contactPerson: newContact.trim(),
        email: newEmail.trim(),
        notes: newNotes.trim(),
        totalClaimsCount: 0,
        totalClaimsValue: 0,
      };
      onAddContract(created);
    }

    // Reset
    setShowAddContractModal(false);
    setNewContractCode('');
    setNewContractNameAr('');
    setNewContractNameEn('');
    setNewCoPay('10');
    setNewMaxCap('100');
    setNewLimit('2000');
    setNewDiscount('5');
    setNewPhone('');
    setNewContact('');
    setNewEmail('');
    setNewNotes('');
  };

  const openEditContract = (c: InsuranceContract) => {
    setEditingContract(c);
    setNewContractCode(c.code);
    setNewContractNameAr(c.nameAr);
    setNewContractNameEn(c.nameEn);
    setNewContractType(c.type);
    setNewCoPay(c.defaultCoPayPercent.toString());
    setNewMaxCap(c.maxCoPayCap?.toString() || '0');
    setNewLimit(c.prescriptionLimit?.toString() || '0');
    setNewDiscount(c.discountPercent.toString());
    setNewPhone(c.phone || '');
    setNewContact(c.contactPerson || '');
    setNewEmail(c.email || '');
    setNewNotes(c.notes || '');
    setShowAddContractModal(true);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {isAr ? 'منظومة التعاقدات والتأمين الطبي والمطالبات' : 'Corporate & Insurance Claims Management'}
              </h1>
              <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full">
                {isAr ? 'نظام متكامل 2026' : 'Pro Module'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
              {isAr
                ? 'إدارة عقود شركات التأمين الخاصة والنقابات والشركات، واحتساب نسب التحمل (Co-Pay)، وسجل المطالبات الشهرية، وتصدير كشوف الحسابات المعتمدة.'
                : 'Manage insurance provider contracts, patient co-pays, approval codes, claims ledger, and batch statement exports.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setSelectedPartnerForBatch(filterContract !== 'All' ? filterContract : 'All');
              setShowBatchClaimModal(true);
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>{isAr ? 'كشف مطالبات الشركة (طباعة)' : 'Print Claims Batch'}</span>
          </button>

          <button
            onClick={() => {
              setEditingContract(null);
              setNewContractCode(`CNT-${Math.floor(100 + Math.random() * 900)}`);
              setShowAddContractModal(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة جهة تعاقد جديدة' : 'Add New Partner'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'إجمالي المطالبات المسجلة' : 'Total Claims Billed'}</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {totalClaimsAmount.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-bold">
            {claims.length} {isAr ? 'مطالبة عبر نقطة البيع' : 'claims total'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'مطالبات معلقة (قيد التحصيل)' : 'Pending Claims'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {pendingClaimsAmount.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-bold">
            {claims.filter(c => c.status === 'Pending').length} {isAr ? 'بانتظار سداد الشركة' : 'awaiting payment'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'مطالبات مسددة ومحصلة' : 'Settled Claims'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {settledClaimsAmount.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-bold">
            {claims.filter(c => c.status === 'Settled').length} {isAr ? 'تم استلامها بحساب الصيدلية' : 'settled to bank'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'تحمل المرضى المحصل كاش' : 'Patient Co-Pays'}</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            {totalPatientPaid.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 font-bold">
            {isAr ? 'تم سدادها في الكاشير فوراً' : 'collected at register'}
          </div>
        </div>
      </div>

      {/* 3. Segmented Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'claims'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isAr ? 'سجل مطالبات التأمين والشركات (Claims Ledger)' : 'Claims Ledger'}</span>
          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full font-mono">
            {claims.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'partners'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'دليل جهات التعاقد والشركات (Partners Directory)' : 'Insurance Partners'}</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs px-2 py-0.5 rounded-full font-mono">
            {contracts.length}
          </span>
        </button>
      </div>

      {/* 4. Tab Content: CLAIMS LEDGER */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم المريض، رقم الكارنيه، أو رقم المطالبة...' : 'Search patient, card #, or claim #...'}
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Partner Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold">{isAr ? 'جهة التعاقد:' : 'Partner:'}</span>
                <select
                  value={filterContract}
                  onChange={(e) => setFilterContract(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="All">{isAr ? 'جميع الشركات' : 'All Partners'}</option>
                  {contracts.map(cnt => (
                    <option key={cnt.id} value={cnt.id}>
                      {isAr ? cnt.nameAr : cnt.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold">{isAr ? 'الحالة:' : 'Status:'}</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="All">{isAr ? 'كل الحالات' : 'All Status'}</option>
                  <option value="Pending">{isAr ? 'معلقة' : 'Pending'}</option>
                  <option value="Approved">{isAr ? 'معتمدة' : 'Approved'}</option>
                  <option value="Settled">{isAr ? 'مسددة' : 'Settled'}</option>
                  <option value="Rejected">{isAr ? 'مرفوضة' : 'Rejected'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Claims Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-black tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">{isAr ? 'رقم المطالبة / الفاتورة' : 'Claim / Inv #'}</th>
                    <th className="p-3.5">{isAr ? 'بيانات المريض & الكارنيه' : 'Patient & Card'}</th>
                    <th className="p-3.5">{isAr ? 'جهة التعاقد والتأمين' : 'Insurance Partner'}</th>
                    <th className="p-3.5">{isAr ? 'رقم الموافقة' : 'Approval #'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'إجمالي الفاتورة' : 'Total'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'تحمل المريض (مسدد)' : 'Patient Paid'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'صافي المطالبة' : 'Claim Amount'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'إجراءات التسوية' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <span>{isAr ? 'لا توجد مطالبات تطابق شروط البحث الحالية.' : 'No claims found.'}</span>
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((clm) => (
                      <tr key={clm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold">
                          <div className="text-teal-700 dark:text-teal-400">{clm.claimNumber}</div>
                          <div className="text-[10px] text-slate-400">{clm.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-400">{new Date(clm.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{clm.patientName}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {isAr ? 'كارنيه: ' : 'Card: '}{clm.cardNumber}
                          </div>
                        </td>

                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isAr ? clm.contractNameAr : clm.contractNameEn}</span>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono">
                          {clm.approvalNumber ? (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                              {clm.approvalNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">{isAr ? 'موافقة مباشرة' : 'Direct'}</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {clm.totalInvoiceAmount.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {clm.patientPaidAmount.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-sm text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30">
                          {clm.claimAmount.toFixed(2)} SAR
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            clm.status === 'Settled'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : clm.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : clm.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          }`}>
                            {clm.status === 'Settled' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isAr ? 'مسددة بالبنك' : 'Settled'}</span>
                              </>
                            ) : clm.status === 'Approved' ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>{isAr ? 'معتمدة' : 'Approved'}</span>
                              </>
                            ) : clm.status === 'Rejected' ? (
                              <>
                                <X className="w-3 h-3" />
                                <span>{isAr ? 'مرفوضة' : 'Rejected'}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{isAr ? 'معلقة' : 'Pending'}</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {clm.status !== 'Settled' && (
                              <button
                                onClick={() => onUpdateClaimStatus(clm.id, 'Settled', 'تم استلام الحوالة البنكية')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                                title={isAr ? 'تسوية وسداد المطالبة واستلام المبلغ' : 'Mark as Settled'}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isAr ? 'تسوية' : 'Settle'}</span>
                              </button>
                            )}
                            {clm.status === 'Pending' && (
                              <button
                                onClick={() => onUpdateClaimStatus(clm.id, 'Approved')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer"
                                title={isAr ? 'اعتماد المطالبة' : 'Approve'}
                              >
                                {isAr ? 'اعتماد' : 'Approve'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content: PARTNERS DIRECTORY */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالاسم، كود التعاقد، أو المسؤول...' : 'Search partner name or code...'}
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              onClick={() => {
                setEditingContract(null);
                setNewContractCode(`CNT-${Math.floor(100 + Math.random() * 900)}`);
                setShowAddContractModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'جهة جديدة' : 'New Partner'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                          {isAr ? partner.nameAr : partner.nameEn}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 font-bold block mt-0.5">
                          {partner.code}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      partner.status === 'Active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                    }`}>
                      {partner.status === 'Active' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقف' : 'Suspended')}
                    </span>
                  </div>

                  {/* Conditions Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'نسبة تحمل المريض:' : 'Default Co-Pay:'}</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{partner.defaultCoPayPercent}%</span>
                      {partner.maxCoPayCap ? (
                        <span className="text-[9px] text-slate-400 block font-mono">
                          {isAr ? `حد أقصى: ${partner.maxCoPayCap} ر.س` : `Max Cap: ${partner.maxCoPayCap}`}
                        </span>
                      ) : null}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'سقف الروشتة:' : 'Rx Limit:'}</span>
                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {partner.prescriptionLimit ? `${partner.prescriptionLimit} SAR` : (isAr ? 'مفتوح' : 'Open')}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        {isAr ? `خصم: ${partner.discountPercent}%` : `Disc: ${partner.discountPercent}%`}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {partner.contactPerson && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{partner.contactPerson}</span>
                      </div>
                    )}
                    {partner.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span dir="ltr">{partner.phone}</span>
                      </div>
                    )}
                  </div>

                  {partner.notes && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/50 leading-relaxed">
                      💡 {partner.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">
                    <span>{isAr ? 'المطالبات:' : 'Claims:'} </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{partner.totalClaimsCount || 0}</strong>
                  </div>

                  <button
                    onClick={() => openEditContract(partner)}
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل الشروط' : 'Edit'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODAL: Add / Edit Contract */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
                <h3 className="font-black text-base">
                  {editingContract
                    ? (isAr ? 'تعديل بيانات جهة التعاقد' : 'Edit Contract Partner')
                    : (isAr ? 'إضافة جهة تعاقد وتأمين جديدة' : 'Add New Contract Partner')}
                </h3>
              </div>
              <button
                onClick={() => setShowAddContractModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'كود التعاقد:' : 'Contract Code:'}</label>
                  <input
                    type="text"
                    required
                    value={newContractCode}
                    onChange={(e) => setNewContractCode(e.target.value)}
                    placeholder="e.g. BUPA-01"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'نوع التعاقد:' : 'Contract Type:'}</label>
                  <select
                    value={newContractType}
                    onChange={(e) => setNewContractType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="Insurance">{isAr ? 'شركة تأمين طبي (Insurance)' : 'Insurance'}</option>
                    <option value="Syndicate">{isAr ? 'صندوق نقابة مهنية (Syndicate)' : 'Syndicate'}</option>
                    <option value="CorporateDirect">{isAr ? 'تعاقد مباشر شركة/بنك (Corporate)' : 'Corporate Direct'}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'اسم جهة التعاقد (بالعربي):' : 'Company Name (Arabic):'}</label>
                <input
                  type="text"
                  required
                  value={newContractNameAr}
                  onChange={(e) => setNewContractNameAr(e.target.value)}
                  placeholder={isAr ? 'مثال: شركة بوبا العربية للتأمين' : 'e.g. Bupa Arabia'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'اسم جهة التعاقد (بالإنجليزي):' : 'Company Name (English):'}</label>
                <input
                  type="text"
                  value={newContractNameEn}
                  onChange={(e) => setNewContractNameEn(e.target.value)}
                  placeholder="e.g. Bupa Arabia Health Insurance"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              {/* Financial Terms */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                <span className="font-black text-emerald-900 dark:text-emerald-300 block text-xs">
                  {isAr ? 'الشروط المالية ونسب التحمل الافتراضية:' : 'Financial Terms & Co-Pay Rules:'}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'تحمل المريض %:' : 'Co-Pay %:'}</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={newCoPay}
                      onChange={(e) => setNewCoPay(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الحد الأقصى للتحمل:' : 'Max Cap:'}</label>
                    <input
                      type="number"
                      min="0"
                      value={newMaxCap}
                      onChange={(e) => setNewMaxCap(e.target.value)}
                      placeholder="0 = لا يوجد"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'سقف الفاتورة:' : 'Rx Limit:'}</label>
                    <input
                      type="number"
                      min="0"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'خصم الجهة %:' : 'Discount %:'}</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'هاتف الموافقات:' : 'Phone:'}</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 800 244 0307"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'مسؤول الاتصال:' : 'Contact Person:'}</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder={isAr ? 'اسم الدكتور / المسؤول' : 'Contact person'}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'البريد الإلكتروني:' : 'Email:'}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="approvals@company.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'ملاحظات وشروط خاصة للصرف:' : 'Dispensing Notes:'}</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: يلزم إرفاق صورة الروشتة والكارنيه للمطالبات الشهرية...' : 'Special instructions...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-md"
                >
                  {editingContract ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'حفظ التعاقد' : 'Add Partner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Batch Claims Statement for Insurance Company (كشف المطالبات المعتمد) */}
      {showBatchClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Action Bar (Not Printed) */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span className="font-black text-sm">
                  {isAr ? 'كشف حساب مطالبات التأمين المعتمد للجهة' : 'Insurance Company Claim Statement'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة الكشف' : 'Print Statement'}</span>
                </button>

                <button
                  onClick={() => setShowBatchClaimModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Statement Sheet */}
            <div className="p-8 space-y-6 overflow-y-auto font-sans text-xs bg-white text-slate-900">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{settings.pharmacyNameAr}</h2>
                  <p className="text-xs text-slate-600">{settings.branchNameAr}</p>
                  <p className="text-xs text-slate-600 font-mono mt-1">الرقم الضريبي: {settings.taxNumber}</p>
                  <p className="text-xs text-slate-600 font-mono">هاتف: {settings.phone}</p>
                </div>

                <div className="text-right">
                  <span className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider block text-center mb-1">
                    كشف مطالبات تأمين معتمد
                  </span>
                  <div className="font-mono text-xs text-slate-700">
                    <div>التاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
                    <div>رقم الكشف: BATCH-{new Date().getFullYear()}-{Math.floor(100 + Math.random() * 900)}</div>
                  </div>
                </div>
              </div>

              {/* Partner Banner */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold">جهة التعاقد المطالب بسدادها:</span>
                  <div className="text-base font-black text-slate-900">
                    {selectedPartnerForBatch === 'All'
                      ? 'جميع جهات التعاقد والتأمين'
                      : contracts.find(c => c.id === selectedPartnerForBatch)?.nameAr || 'جهة التعاقد'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block font-bold">إجمالي المطالبات في هذا الكشف:</span>
                  <div className="text-lg font-black font-mono text-emerald-800">
                    {(selectedPartnerForBatch === 'All' 
                      ? filteredClaims 
                      : filteredClaims.filter(c => c.contractId === selectedPartnerForBatch)
                    ).reduce((sum, c) => sum + c.claimAmount, 0).toFixed(2)} SAR
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-right border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-black">
                    <th className="border border-slate-300 p-2">م</th>
                    <th className="border border-slate-300 p-2">رقم المطالبة</th>
                    <th className="border border-slate-300 p-2">رقم الفاتورة</th>
                    <th className="border border-slate-300 p-2">التاريخ</th>
                    <th className="border border-slate-300 p-2">اسم المريض</th>
                    <th className="border border-slate-300 p-2">رقم الكارنيه</th>
                    <th className="border border-slate-300 p-2">رقم الموافقة</th>
                    <th className="border border-slate-300 p-2 text-center">إجمالي الفاتورة</th>
                    <th className="border border-slate-300 p-2 text-center">تحمل المريض</th>
                    <th className="border border-slate-300 p-2 text-center">الصافي المطالب به</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPartnerForBatch === 'All' 
                    ? filteredClaims 
                    : filteredClaims.filter(c => c.contractId === selectedPartnerForBatch)
                  ).map((clm, index) => (
                    <tr key={clm.id} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 font-mono text-center">{index + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold">{clm.claimNumber}</td>
                      <td className="border border-slate-300 p-2 font-mono">{clm.invoiceNumber}</td>
                      <td className="border border-slate-300 p-2 font-mono">{new Date(clm.createdAt).toLocaleDateString('ar-SA')}</td>
                      <td className="border border-slate-300 p-2 font-bold">{clm.patientName}</td>
                      <td className="border border-slate-300 p-2 font-mono">{clm.cardNumber}</td>
                      <td className="border border-slate-300 p-2 font-mono">{clm.approvalNumber || '-'}</td>
                      <td className="border border-slate-300 p-2 font-mono text-center">{clm.totalInvoiceAmount.toFixed(2)}</td>
                      <td className="border border-slate-300 p-2 font-mono text-center">{clm.patientPaidAmount.toFixed(2)}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-center">{clm.claimAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures & Stamp */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
                <div>
                  <div className="border-b border-slate-400 pb-8 mb-2">إعداد الصيدلي المسؤول</div>
                  <div className="font-bold">د. الصيدلي المناوب</div>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-8 mb-2">المراجعة والتدقيق المالي</div>
                  <div className="font-bold">قسم الحسابات والتعاقدات</div>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-8 mb-2">ختم الصيدلية الرسمي</div>
                  <div className="font-bold text-slate-400">«ختم معتمد»</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
