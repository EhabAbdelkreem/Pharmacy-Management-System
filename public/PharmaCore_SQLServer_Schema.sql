-- =========================================================================================
-- PharmaCore Enterprise - Microsoft SQL Server Local Database Schema (Hybrid Architecture)
-- Compatible with: Microsoft SQL Server 2016, 2019, 2022 & SQL Server Express (LocalDB)
-- Description: Complete offline-first pharmacy schema with FEFO batch engine & cloud sync outbox
-- =========================================================================================

-- 1. Create Database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PharmaCore_Local')
BEGIN
    CREATE DATABASE PharmaCore_Local
    COLLATE Arabic_100_CI_AS;
END
GO

USE PharmaCore_Local;
GO

-- 2. Pharmacist Users & RBAC Permissions Table
IF OBJECT_ID('dbo.Pharmacists', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pharmacists (
        Id NVARCHAR(64) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        PinHash NVARCHAR(128) NOT NULL,
        NameAr NVARCHAR(150) NOT NULL,
        NameEn NVARCHAR(150) NOT NULL,
        LicenseNumber NVARCHAR(64) NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'Pharmacist', -- 'Admin', 'ShiftSupervisor', 'Pharmacist', 'Cashier'
        Phone NVARCHAR(50) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CanAccessOwnerPanel BIT NOT NULL DEFAULT 0,
        CanViewProfitsAndCost BIT NOT NULL DEFAULT 0,
        CanEditPrices BIT NOT NULL DEFAULT 0,
        CanCloseDayZReport BIT NOT NULL DEFAULT 0,
        CanManageInventory BIT NOT NULL DEFAULT 1,
        CanManageStaff BIT NOT NULL DEFAULT 0,
        CanVoidInvoices BIT NOT NULL DEFAULT 0,
        CanGiveDiscount BIT NOT NULL DEFAULT 1,
        MaxDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastModifiedUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 3. Medicines Catalog Table
IF OBJECT_ID('dbo.Medicines', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Medicines (
        Id NVARCHAR(64) PRIMARY KEY,
        TradeNameAr NVARCHAR(255) NOT NULL,
        TradeNameEn NVARCHAR(255) NOT NULL,
        GenericName NVARCHAR(255) NULL,
        Barcode NVARCHAR(64) NOT NULL UNIQUE,
        PublicPriceBox DECIMAL(18,2) NOT NULL,
        PublicPriceStrip DECIMAL(18,2) NOT NULL,
        PurchasePriceBox DECIMAL(18,2) NOT NULL,
        Category NVARCHAR(100) NOT NULL DEFAULT N'عام',
        DosageForm NVARCHAR(50) NOT NULL DEFAULT 'Tablets',
        StripCount INT NOT NULL DEFAULT 2,
        RequiresPrescription BIT NOT NULL DEFAULT 0,
        MinReorderLevel INT NOT NULL DEFAULT 5,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastModifiedUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CloudSyncStatus NVARCHAR(30) NOT NULL DEFAULT 'Synced'
    );
    CREATE NONCLUSTERED INDEX IX_Medicines_Barcode ON dbo.Medicines(Barcode);
    CREATE NONCLUSTERED INDEX IX_Medicines_Category ON dbo.Medicines(Category);
END
GO

-- 4. Medicine Batches Table (FEFO Engine - First Expired, First Out)
IF OBJECT_ID('dbo.MedicineBatches', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MedicineBatches (
        Id NVARCHAR(64) PRIMARY KEY,
        MedicineId NVARCHAR(64) NOT NULL,
        BatchNumber NVARCHAR(64) NOT NULL,
        ExpiryDate DATE NOT NULL,
        QuantityRemaining INT NOT NULL DEFAULT 0,
        UnitCost DECIMAL(18,2) NOT NULL,
        SupplierName NVARCHAR(150) NULL,
        ReceivedDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        LastModifiedUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Batches_Medicines FOREIGN KEY (MedicineId) REFERENCES dbo.Medicines(Id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_Batches_FEFO ON dbo.MedicineBatches(MedicineId, ExpiryDate ASC, QuantityRemaining DESC);
END
GO

-- 5. Shifts Management Table
IF OBJECT_ID('dbo.Shifts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shifts (
        Id NVARCHAR(64) PRIMARY KEY,
        ShiftNumber INT NOT NULL,
        PharmacistId NVARCHAR(64) NOT NULL,
        PharmacistName NVARCHAR(150) NOT NULL,
        OpenedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ClosedAt DATETIME2 NULL,
        StartingCash DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        EndingCash DECIMAL(18,2) NULL,
        TotalSalesCash DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        TotalSalesVisa DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        TotalSalesInsurance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Discrepancy DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Open', -- 'Open', 'Closed'
        CloudSyncStatus NVARCHAR(30) NOT NULL DEFAULT 'PendingCloud',
        CONSTRAINT FK_Shifts_Pharmacists FOREIGN KEY (PharmacistId) REFERENCES dbo.Pharmacists(Id)
    );
END
GO

-- 6. Sales Invoices Header Table
IF OBJECT_ID('dbo.SalesInvoices', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoices (
        Id NVARCHAR(64) PRIMARY KEY,
        InvoiceNumber NVARCHAR(64) NOT NULL UNIQUE,
        ShiftId NVARCHAR(64) NULL,
        PharmacistId NVARCHAR(64) NOT NULL,
        PharmacistName NVARCHAR(150) NOT NULL,
        Subtotal DECIMAL(18,2) NOT NULL,
        DiscountTotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        TaxTotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        NetTotal DECIMAL(18,2) NOT NULL,
        PaymentMethod NVARCHAR(50) NOT NULL DEFAULT 'Cash', -- 'Cash', 'CreditCard', 'Insurance', 'VodafoneCash', 'CustomerCredit'
        CustomerName NVARCHAR(150) NULL,
        CustomerPhone NVARCHAR(50) NULL,
        InsuranceCompany NVARCHAR(150) NULL,
        InsuranceClaimNumber NVARCHAR(64) NULL,
        InsuranceCopayAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Status NVARCHAR(30) NOT NULL DEFAULT 'Completed', -- 'Completed', 'Voided'
        CloudSyncStatus NVARCHAR(30) NOT NULL DEFAULT 'PendingCloud',
        CloudSyncedAtUtc DATETIME2 NULL,
        CONSTRAINT FK_Invoices_Shifts FOREIGN KEY (ShiftId) REFERENCES dbo.Shifts(Id),
        CONSTRAINT FK_Invoices_Pharmacists FOREIGN KEY (PharmacistId) REFERENCES dbo.Pharmacists(Id)
    );
    CREATE NONCLUSTERED INDEX IX_Invoices_Sync ON dbo.SalesInvoices(CloudSyncStatus, CreatedAtUtc);
END
GO

-- 7. Sales Invoice Line Items Table
IF OBJECT_ID('dbo.InvoiceItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvoiceItems (
        Id NVARCHAR(64) PRIMARY KEY,
        InvoiceId NVARCHAR(64) NOT NULL,
        MedicineId NVARCHAR(64) NOT NULL,
        BatchId NVARCHAR(64) NULL,
        TradeNameAr NVARCHAR(255) NOT NULL,
        Quantity INT NOT NULL,
        UnitType NVARCHAR(20) NOT NULL DEFAULT 'Box', -- 'Box', 'Strip', 'Unit'
        UnitPrice DECIMAL(18,2) NOT NULL,
        UnitCost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        LineTotal DECIMAL(18,2) NOT NULL,
        ProfitAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CONSTRAINT FK_Items_Invoices FOREIGN KEY (InvoiceId) REFERENCES dbo.SalesInvoices(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Items_Medicines FOREIGN KEY (MedicineId) REFERENCES dbo.Medicines(Id)
    );
END
GO

-- 8. Customer Credit Accounts (الدائنون والديون)
IF OBJECT_ID('dbo.CustomerCredits', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerCredits (
        Id NVARCHAR(64) PRIMARY KEY,
        CustomerName NVARCHAR(150) NOT NULL,
        Phone NVARCHAR(50) NOT NULL,
        CurrentBalance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CreditLimit DECIMAL(18,2) NOT NULL DEFAULT 500.00,
        Notes NVARCHAR(500) NULL,
        LastPaymentDate DATE NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 9. Cloud Sync Outbox Table (محرك المزامنة التلقائية الثنائية)
IF OBJECT_ID('dbo.CloudSyncOutbox', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CloudSyncOutbox (
        OutboxId BIGINT IDENTITY(1,1) PRIMARY KEY,
        EntityType NVARCHAR(50) NOT NULL, -- 'Invoice', 'Batch', 'Shift', 'Medicine'
        EntityId NVARCHAR(64) NOT NULL,
        ActionType NVARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
        PayloadJson NVARCHAR(MAX) NOT NULL,
        QueuedAtUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ProcessedAtUtc DATETIME2 NULL,
        RetryCount INT NOT NULL DEFAULT 0,
        SyncStatus NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Synced', 'Failed'
        ErrorMessage NVARCHAR(MAX) NULL
    );
    CREATE NONCLUSTERED INDEX IX_Outbox_Pending ON dbo.CloudSyncOutbox(SyncStatus, QueuedAtUtc);
END
GO

-- =========================================================================================
-- 10. Sample Initial Seeds (أدوية تجريبية للتشغيل الفوري في SQL Server)
-- =========================================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Pharmacists WHERE Id = 'ph-admin')
BEGIN
    INSERT INTO dbo.Pharmacists (
        Id, Username, PinHash, NameAr, NameEn, LicenseNumber, Role, Phone, IsActive,
        CanAccessOwnerPanel, CanViewProfitsAndCost, CanEditPrices, CanCloseDayZReport,
        CanManageInventory, CanManageStaff, CanVoidInvoices, CanGiveDiscount, MaxDiscountPercent
    ) VALUES (
        'ph-admin', 'admin', '1234', N'د. أحمد مجدي (مدير النظام)', 'Dr. Ahmed Magdy', 'MOH-EGY-09881', 'Admin', '01000000001', 1,
        1, 1, 1, 1, 1, 1, 1, 1, 100.00
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Medicines WHERE Barcode = '6221156001234')
BEGIN
    INSERT INTO dbo.Medicines (Id, TradeNameAr, TradeNameEn, GenericName, Barcode, PublicPriceBox, PublicPriceStrip, PurchasePriceBox, Category, DosageForm, StripCount, RequiresPrescription, MinReorderLevel)
    VALUES ('med-1', N'بانادول اكسترا 500 مجم', 'Panadol Extra 500mg', 'Paracetamol + Caffeine', '6221156001234', 45.00, 22.50, 34.00, N'مسكنات وألم', 'Tablets', 2, 0, 10);

    INSERT INTO dbo.MedicineBatches (Id, MedicineId, BatchNumber, ExpiryDate, QuantityRemaining, UnitCost, SupplierName)
    VALUES ('batch-1', 'med-1', 'PE-2025-01', '2026-11-30', 48, 34.00, N'الشركة المتحدة للتوزيع');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Medicines WHERE Barcode = '6221156005678')
BEGIN
    INSERT INTO dbo.Medicines (Id, TradeNameAr, TradeNameEn, GenericName, Barcode, PublicPriceBox, PublicPriceStrip, PurchasePriceBox, Category, DosageForm, StripCount, RequiresPrescription, MinReorderLevel)
    VALUES ('med-2', N'كونجستال أقراص للبرد', 'Congestal Cold & Flu', 'Paracetamol + Pseudoephedrine + Chlorpheniramine', '6221156005678', 35.00, 17.50, 26.50, N'أمراض البرد والإنفلونزا', 'Tablets', 2, 0, 15);

    INSERT INTO dbo.MedicineBatches (Id, MedicineId, BatchNumber, ExpiryDate, QuantityRemaining, UnitCost, SupplierName)
    VALUES ('batch-2', 'med-2', 'CG-2025-09', '2027-04-15', 30, 26.50, N'ابن سينا فارما');
END
GO

PRINT N'✓ PharmaCore Local SQL Server database & tables initialized successfully with FEFO and Cloud Sync!';
