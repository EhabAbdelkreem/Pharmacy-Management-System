import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PosTerminal } from './components/PosTerminal';
import { InventoryManager } from './components/InventoryManager';
import { ShiftManager } from './components/ShiftManager';
import { OwnerControlPanel } from './components/OwnerControlPanel';
import { ClientsCrmView } from './components/ClientsCrmView';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { LoginModal } from './components/LoginModal';
import { ContractsManager } from './components/ContractsManager';
import { AuthPage } from './components/AuthPage';
import { MonthlyConsumptionReports } from './components/MonthlyConsumptionReports';
import { 
  Medicine, 
  SalesInvoice, 
  Shift, 
  PharmacySettings, 
  BatchItem, 
  UnitType, 
  DailyCloseReport, 
  SaaSTenantConfig, 
  PharmacistUser,
  SaaSClient,
  InsuranceContract,
  InsuranceClaim
} from './types/pharmacy';
import { 
  INITIAL_MEDICINES, 
  INITIAL_SHIFT, 
  DEFAULT_PHARMACY_SETTINGS, 
  INITIAL_TENANT_CONFIG, 
  INITIAL_PHARMACISTS,
  INITIAL_SAAS_CLIENTS
} from './data/mockData';
import { 
  INITIAL_INSURANCE_CONTRACTS, 
  INITIAL_INSURANCE_CLAIMS 
} from './data/mockContracts';
import { calculateTotalStock } from './services/fefoEngine';
import { apiClient } from './services/apiClient';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { offlineSyncEngine } from './services/offlineSyncEngine';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'shifts' | 'contracts' | 'reports' | 'owner' | 'clients'>('pos');
  
  // Persistent or stateful domain entities
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [shifts, setShifts] = useState<Shift[]>([INITIAL_SHIFT]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(INITIAL_SHIFT);
  const [dailyReports, setDailyReports] = useState<DailyCloseReport[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [tenantConfig, setTenantConfig] = useState<SaaSTenantConfig>(INITIAL_TENANT_CONFIG);
  const [pharmacists, setPharmacists] = useState<PharmacistUser[]>(INITIAL_PHARMACISTS);
  const [currentUser, setCurrentUser] = useState<PharmacistUser>(() => {
    try {
      const saved = localStorage.getItem('pharmacore_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_PHARMACISTS[0];
  });
  const [isAuthPageVisible, setIsAuthPageVisible] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [clients, setClients] = useState<SaaSClient[]>(INITIAL_SAAS_CLIENTS);
  const [activePharmacyClient, setActivePharmacyClient] = useState<SaaSClient | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const sub = params.get('pharmacy');
        if (sub) {
          const cleanSub = sub.toLowerCase().trim();
          const found = INITIAL_SAAS_CLIENTS.find(
            (c) => c.subdomain.toLowerCase() === cleanSub
          );
          if (found) return found;
          return {
            id: `cli-${cleanSub}`,
            pharmacyName: `صيدلية ${cleanSub.toUpperCase()}`,
            ownerName: 'مدير الصيدلية',
            phone: '',
            subdomain: cleanSub,
            billingCycle: 'Annual',
            priceAmount: 899,
            currency: 'SAR',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '2027-12-31',
            paymentMethod: 'CreditCard',
            status: 'Active',
            branchesAllowed: 3,
          };
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  });
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<SalesInvoice | null>(null);
  const [externalBarcodeToScan, setExternalBarcodeToScan] = useState<string | null>(null);

  // Corporate & Insurance Contracts and Claims state
  const [contracts, setContracts] = useState<InsuranceContract[]>(() => {
    try {
      const saved = localStorage.getItem('pharmacore_contracts');
      return saved ? JSON.parse(saved) : INITIAL_INSURANCE_CONTRACTS;
    } catch {
      return INITIAL_INSURANCE_CONTRACTS;
    }
  });

  const [claims, setClaims] = useState<InsuranceClaim[]>(() => {
    try {
      const saved = localStorage.getItem('pharmacore_claims');
      return saved ? JSON.parse(saved) : INITIAL_INSURANCE_CLAIMS;
    } catch {
      return INITIAL_INSURANCE_CLAIMS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pharmacore_contracts', JSON.stringify(contracts));
    } catch (e) {
      console.warn(e);
    }
  }, [contracts]);

  useEffect(() => {
    try {
      localStorage.setItem('pharmacore_claims', JSON.stringify(claims));
    } catch (e) {
      console.warn(e);
    }
  }, [claims]);

  const handleAddContract = (cnt: InsuranceContract) => {
    setContracts((prev) => [cnt, ...prev]);
  };

  const handleUpdateContract = (cnt: InsuranceContract) => {
    setContracts((prev) => prev.map((c) => (c.id === cnt.id ? cnt : c)));
  };

  const handleUpdateClaimStatus = (claimId: string, newStatus: InsuranceClaim['status'], notes?: string) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          return {
            ...c,
            status: newStatus,
            notes: notes || c.notes,
            settledAt: newStatus === 'Settled' ? new Date().toISOString() : c.settledAt,
          };
        }
        return c;
      })
    );
  };

  const handleAddClaim = (claim: InsuranceClaim) => {
    setClaims((prev) => [claim, ...prev]);
  };

  // Compute live low stock count across catalog using ReorderLevel
  const lowStockCount = medicines.filter((m) => calculateTotalStock(m).totalBoxes <= m.reorderLevel).length;

  // Role-Based Access Control Guard:
  // Strictly prevent non-managers from accessing Owner Suite or Clients CRM
  useEffect(() => {
    if ((activeTab === 'owner' || activeTab === 'clients') && !currentUser.permissions.canAccessOwnerPanel) {
      setActiveTab('pos');
    }
  }, [currentUser, activeTab]);

  // Synchronize document direction for Arabic RTL / English LTR and Theme class
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [lang, theme]);

  // Load initial pharmacy dataset from Cloud SQL backend
  useEffect(() => {
    apiClient.getMedicines().then((data) => {
      if (data && data.length > 0) {
        setMedicines(data);
        offlineSyncEngine.cacheMedicines(data);
      }
    }).catch((err) => {
      console.warn('Network issue fetching medicines, loading from local offline cache:', err);
      const cached = offlineSyncEngine.getCachedMedicines();
      if (cached && cached.length > 0) {
        setMedicines(cached);
      }
    });

    apiClient.getEmployees().then((data) => {
      if (data && data.length > 0) {
        setPharmacists(data);
        setCurrentUser(data[0]);
      }
    }).catch(console.error);

    apiClient.getShifts().then((data) => {
      if (data && data.length > 0) {
        setShifts(data);
        const openShift = data.find((s) => s.status === 'Open');
        if (openShift) setCurrentShift(openShift);
      }
    }).catch(console.error);

    apiClient.getInvoices().then((data) => {
      if (data && data.length > 0) setInvoices(data);
    }).catch(console.error);

    apiClient.getTenantConfig().then((data) => {
      if (data) setTenantConfig(data);
    }).catch(console.error);

    apiClient.getSaasClients().then((data) => {
      if (data && data.length > 0) setClients(data);
    }).catch(console.error);
  }, []);

  // Handle Sales Invoice Creation with real FEFO stock deduction
  const handleInvoiceCreated = (newInvoice: SalesInvoice) => {
    // 1. Deduct stock from medicines batches following FEFO
    setMedicines((prevMeds) => {
      return prevMeds.map((med) => {
        const invoiceItemsForMed = newInvoice.items.filter((item) => item.medicineId === med.id);
        if (invoiceItemsForMed.length === 0) return med;

        // Clone batches
        const updatedBatches = med.batches.map((batch) => {
          const matchedItem = invoiceItemsForMed.find((item) => item.batchNumber === batch.batchNumber);
          if (!matchedItem) return batch;

          let newBoxes = batch.quantityBoxesAvailable;
          let newStrips = batch.quantityStripsAvailable;

          if (matchedItem.unitType === 'Box') {
            newBoxes = Math.max(0, newBoxes - matchedItem.quantity);
          } else {
            // Strip deduction
            if (newStrips >= matchedItem.quantity) {
              newStrips -= matchedItem.quantity;
            } else {
              const needed = matchedItem.quantity - newStrips;
              newStrips = 0;
              const boxesToBreak = Math.ceil(needed / med.unitsPerBox);
              newBoxes = Math.max(0, newBoxes - boxesToBreak);
              newStrips = (boxesToBreak * med.unitsPerBox) - needed;
            }
          }

          return {
            ...batch,
            quantityBoxesAvailable: newBoxes,
            quantityStripsAvailable: newStrips,
          };
        });

        return {
          ...med,
          batches: updatedBatches,
        };
      });
    });

    // 2. Register financial impact on active shift
    if (currentShift) {
      setCurrentShift((prevShift) => {
        if (!prevShift) return null;
        let cashInc = 0;
        let cardInc = 0;
        let insuranceInc = 0;

        if (newInvoice.paymentMethod === 'Cash') {
          cashInc = newInvoice.grandTotal;
        } else if (newInvoice.paymentMethod === 'Card') {
          cardInc = newInvoice.grandTotal;
        } else if (newInvoice.paymentMethod === 'Insurance') {
          insuranceInc = newInvoice.grandTotal;
        }

        const newExpectedCash = prevShift.openingCash + (prevShift.totalCashSales + cashInc) - prevShift.cashWithdrawals;

        const updatedShift: Shift = {
          ...prevShift,
          totalCashSales: prevShift.totalCashSales + cashInc,
          totalCardSales: prevShift.totalCardSales + cardInc,
          totalInsuranceSales: prevShift.totalInsuranceSales + insuranceInc,
          expectedCashTotal: newExpectedCash,
          invoicesCount: prevShift.invoicesCount + 1,
        };

        // Sync with shifts list
        setShifts((prevList) => prevList.map((s) => (s.id === updatedShift.id ? updatedShift : s)));

        return updatedShift;
      });
    }

    // 3. Update pharmacist performance
    setPharmacists((prev) =>
      prev.map((p) => {
        if (p.nameAr.includes(newInvoice.pharmacistName) || newInvoice.pharmacistName.includes(p.nameAr)) {
          return {
            ...p,
            totalSalesGenerated: p.totalSalesGenerated + newInvoice.grandTotal,
          };
        }
        return p;
      })
    );

    // 4. Append invoice
    setInvoices((prev) => [newInvoice, ...prev]);

    // 5. Persist Invoice to Cloud SQL or Queue into Offline Storage
    if (offlineSyncEngine.isEffectivelyOnline()) {
      apiClient.createInvoice(newInvoice).catch((err) => {
        console.warn('Network request failed, queuing invoice for offline sync:', err);
        offlineSyncEngine.queueInvoice(newInvoice);
      });
    } else {
      offlineSyncEngine.queueInvoice(newInvoice);
    }
  };

  const handleBatchSyncSuccess = (syncedCount: number) => {
    // Refresh latest invoices and medicines from Cloud SQL
    apiClient.getInvoices().then((data) => {
      if (data && data.length > 0) setInvoices(data);
    }).catch(console.error);

    apiClient.getMedicines().then((data) => {
      if (data && data.length > 0) {
        setMedicines(data);
        offlineSyncEngine.cacheMedicines(data);
      }
    }).catch(console.error);
  };

  // Add new batch from Inventory Manager
  const handleAddBatch = (medicineId: string, newBatchData: Omit<BatchItem, 'id' | 'medicineId'>) => {
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== medicineId) return med;
        const newBatch: BatchItem = {
          ...newBatchData,
          id: `bch-${Date.now()}`,
          medicineId,
        };
        const updatedMed = {
          ...med,
          batches: [...med.batches, newBatch],
        };
        apiClient.saveMedicine(updatedMed).catch(console.error);
        return updatedMed;
      })
    );
  };

  // Close Current Shift with Blind Cash Count Reconciliation
  const handleCloseShift = (countedCash: number, notes: string) => {
    if (!currentShift) return;
    const variance = countedCash - currentShift.expectedCashTotal;
    const closedShift: Shift = {
      ...currentShift,
      status: 'Closed',
      closedAt: new Date().toISOString(),
      actualCashCounted: countedCash,
      variance,
      closureNotes: notes,
    };

    setCurrentShift(closedShift);
    setShifts((prev) => prev.map((s) => (s.id === closedShift.id ? closedShift : s)));
    apiClient.saveShift(closedShift).catch(console.error);

    // Track discrepancy on pharmacist
    setPharmacists((prev) =>
      prev.map((p) => {
        if (p.nameAr.includes(currentShift.pharmacistName) || currentShift.pharmacistName.includes(p.nameAr)) {
          const updatedP = {
            ...p,
            totalDiscrepancy: p.totalDiscrepancy + variance,
            completedShiftsCount: p.completedShiftsCount + 1,
          };
          apiClient.saveEmployee(updatedP).catch(console.error);
          return updatedP;
        }
        return p;
      })
    );
  };

  // Open New Shift
  const handleOpenShift = (pharmacistName: string, openingCash: number, shiftNumber: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber,
      pharmacistId: `ph-${Date.now()}`,
      pharmacistName,
      status: 'Open',
      openedAt: new Date().toISOString(),
      openingCash,
      totalCashSales: 0,
      totalCardSales: 0,
      totalInsuranceSales: 0,
      cashWithdrawals: 0,
      expectedCashTotal: openingCash,
      invoicesCount: 0,
    };

    setCurrentShift(newShift);
    setShifts((prev) => [...prev, newShift]);
    apiClient.saveShift(newShift).catch(console.error);
  };

  // Change Shift (Handover to Next Pharmacist)
  const handleChangeShift = (
    nextPharmacistName: string,
    countedCash: number,
    nextOpeningCash: number,
    notes: string
  ) => {
    if (currentShift) {
      const variance = countedCash - currentShift.expectedCashTotal;
      const closedShift: Shift = {
        ...currentShift,
        status: 'Closed',
        closedAt: new Date().toISOString(),
        actualCashCounted: countedCash,
        variance,
        closureNotes: notes,
      };

      const nextShiftNumber = currentShift.shiftNumber + 1;
      const newShift: Shift = {
        id: `shift-${Date.now()}`,
        shiftNumber: nextShiftNumber,
        pharmacistId: `ph-${Date.now()}`,
        pharmacistName: nextPharmacistName,
        status: 'Open',
        openedAt: new Date().toISOString(),
        openingCash: nextOpeningCash,
        totalCashSales: 0,
        totalCardSales: 0,
        totalInsuranceSales: 0,
        cashWithdrawals: 0,
        expectedCashTotal: nextOpeningCash,
        invoicesCount: 0,
      };

      setCurrentShift(newShift);
      setShifts((prev) => [...prev.map((s) => (s.id === closedShift.id ? closedShift : s)), newShift]);
      apiClient.saveShift(closedShift).catch(console.error);
      apiClient.saveShift(newShift).catch(console.error);

      // Update pharmacist discrepancy
      setPharmacists((prev) =>
        prev.map((p) => {
          if (p.nameAr.includes(currentShift.pharmacistName) || currentShift.pharmacistName.includes(p.nameAr)) {
            const updatedP = {
              ...p,
              totalDiscrepancy: p.totalDiscrepancy + variance,
              completedShiftsCount: p.completedShiftsCount + 1,
            };
            apiClient.saveEmployee(updatedP).catch(console.error);
            return updatedP;
          }
          return p;
        })
      );
    }
  };

  // Close Accounting Day (Z-Report Generation)
  const handleCloseDay = (
    reportData: Omit<DailyCloseReport, 'id' | 'reportNumber' | 'closedAt'>
  ): DailyCloseReport => {
    const today = new Date();
    const dateCode = today.toISOString().slice(0, 10).replace(/-/g, '');
    const reportNumber = `Z-REP-${dateCode}-${String(dailyReports.length + 1).padStart(3, '0')}`;

    const newReport: DailyCloseReport = {
      ...reportData,
      id: `z-rep-${Date.now()}`,
      reportNumber,
      closedAt: today.toISOString(),
    };

    setDailyReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  // Owner Actions
  const handleUpdateMedicinePrice = (medicineId: string, newPriceBox: number, newPriceStrip: number) => {
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== medicineId) return med;
        const updatedMed = {
          ...med,
          pricePerBox: newPriceBox,
          pricePerStrip: newPriceStrip,
          batches: med.batches.map((b) => ({
            ...b,
            sellingPriceBox: newPriceBox,
            sellingPriceStrip: newPriceStrip,
          })),
        };
        apiClient.saveMedicine(updatedMed).catch(console.error);
        return updatedMed;
      })
    );
  };

  const handleAddNewMedicine = (newMedicine: Medicine) => {
    setMedicines((prev) => [newMedicine, ...prev]);
    apiClient.saveMedicine(newMedicine).catch(console.error);
  };

  const handleUpdateTenantConfig = (updated: Partial<SaaSTenantConfig>) => {
    setTenantConfig((prev) => {
      const merged = { ...prev, ...updated };
      apiClient.saveTenantConfig(merged).catch(console.error);
      return merged;
    });
  };

  const handleUpdatePharmacist = (pharmacistId: string, updates: Partial<PharmacistUser>) => {
    setPharmacists((prev) =>
      prev.map((p) => {
        if (p.id === pharmacistId) {
          const updatedP = { ...p, ...updates };
          apiClient.saveEmployee(updatedP).catch(console.error);
          return updatedP;
        }
        return p;
      })
    );
  };

  const handleAddPharmacist = (newPharmacist: PharmacistUser) => {
    setPharmacists((prev) => [...prev, newPharmacist]);
    apiClient.saveEmployee(newPharmacist).catch(console.error);
  };

  const handleSaveClient = (client: SaaSClient) => {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = client;
        return updated;
      }
      return [client, ...prev];
    });
    apiClient.saveSaasClient(client).catch(console.error);
  };

  const handleDeleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    apiClient.deleteSaasClient(id).catch(console.error);
  };

  const handleLogin = (user: PharmacistUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('pharmacore_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn(e);
    }
    setIsAuthPageVisible(false);
    if (!user.permissions.canAccessOwnerPanel && (activeTab === 'owner' || activeTab === 'clients')) {
      setActiveTab('pos');
    }
  };

  const handleLogout = () => {
    setIsAuthPageVisible(true);
  };

  const handleSwitchToStaff = () => {
    const staff = pharmacists.find((p) => p.role === 'Pharmacist') || INITIAL_PHARMACISTS[1];
    handleLogin(staff);
  };

  const handleSwitchToAdmin = () => {
    const admin = pharmacists.find((p) => p.role === 'Admin') || INITIAL_PHARMACISTS[0];
    handleLogin(admin);
  };

  // If Auth Page is explicitly requested or on sign-out, render full screen AuthPage
  if (isAuthPageVisible) {
    return (
      <AuthPage
        currentUser={currentUser}
        pharmacists={pharmacists}
        onLogin={handleLogin}
        onRegisterStaff={(newUser) => {
          setPharmacists((prev) => [...prev, newUser]);
          handleLogin(newUser);
        }}
        onRegisterPharmacyClient={handleSaveClient}
        activePharmacyClient={activePharmacyClient}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-teal-600 selection:text-white">
      {/* Top System Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        currentShift={currentShift}
        currentUser={currentUser}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onOpenAuthPage={() => setIsAuthPageVisible(true)}
        onLogout={handleLogout}
        onSwitchToAdmin={handleSwitchToAdmin}
        onSwitchToStaff={handleSwitchToStaff}
        lowStockCount={lowStockCount}
      />

      {/* Offline POS & Cloud Auto-Sync Banner */}
      <OfflineSyncBanner onSyncSuccess={handleBatchSyncSuccess} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'pos' && (
          <PosTerminal
            medicines={medicines}
            currentShift={currentShift}
            currentUser={currentUser}
            settings={DEFAULT_PHARMACY_SETTINGS}
            onInvoiceCreated={handleInvoiceCreated}
            lang={lang}
            onOpenReceipt={(inv) => setActiveReceiptInvoice(inv)}
            onNavigateToShifts={() => setActiveTab('shifts')}
            externalBarcodeToScan={externalBarcodeToScan}
            onClearExternalBarcode={() => setExternalBarcodeToScan(null)}
            contracts={contracts}
            onClaimCreated={handleAddClaim}
          />
        )}

        {activeTab === 'contracts' && (
          <ContractsManager
            contracts={contracts}
            claims={claims}
            onAddContract={handleAddContract}
            onUpdateContract={handleUpdateContract}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onAddManualClaim={handleAddClaim}
            settings={DEFAULT_PHARMACY_SETTINGS}
            lang={lang}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            medicines={medicines}
            onAddBatch={handleAddBatch}
            lang={lang}
            canViewCost={currentUser.permissions.canViewProfitsAndCost}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftManager
            currentShift={currentShift}
            shifts={shifts}
            invoices={invoices}
            dailyReports={dailyReports}
            settings={DEFAULT_PHARMACY_SETTINGS}
            onCloseShift={handleCloseShift}
            onOpenShift={handleOpenShift}
            onChangeShift={handleChangeShift}
            onCloseDay={handleCloseDay}
            lang={lang}
            onViewInvoiceReceipt={(inv) => setActiveReceiptInvoice(inv)}
            canCloseDay={currentUser.permissions.canCloseDayZReport}
          />
        )}

        {activeTab === 'reports' && (
          <MonthlyConsumptionReports
            medicines={medicines}
            invoices={invoices}
            settings={DEFAULT_PHARMACY_SETTINGS}
            lang={lang}
            canViewFinancials={currentUser.permissions.canViewProfitsAndCost}
          />
        )}

        {activeTab === 'owner' && (
          <OwnerControlPanel
            medicines={medicines}
            invoices={invoices}
            shifts={shifts}
            settings={DEFAULT_PHARMACY_SETTINGS}
            tenantConfig={tenantConfig}
            pharmacists={pharmacists}
            onUpdateMedicinePrice={handleUpdateMedicinePrice}
            onAddNewMedicine={handleAddNewMedicine}
            onUpdateTenantConfig={handleUpdateTenantConfig}
            onUpdatePharmacist={handleUpdatePharmacist}
            onAddPharmacist={handleAddPharmacist}
            lang={lang}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsCrmView
            clients={clients}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            lang={lang}
          />
        )}
      </main>

      {/* 80mm Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        invoice={activeReceiptInvoice}
        settings={DEFAULT_PHARMACY_SETTINGS}
        isOpen={!!activeReceiptInvoice}
        onClose={() => setActiveReceiptInvoice(null)}
        lang={lang}
      />

      {/* User Login, Staff Switcher & Registration Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        currentUser={currentUser}
        pharmacists={pharmacists}
        onLogin={(user) => {
          handleLogin(user);
          setShowLoginModal(false);
        }}
        onRegisterStaff={(newUser) => {
          setPharmacists((prev) => [...prev, newUser]);
          handleLogin(newUser);
          setShowLoginModal(false);
        }}
        onRegisterPharmacyClient={handleSaveClient}
        lang={lang}
      />
    </div>
  );
}
