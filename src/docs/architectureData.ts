export interface CodeDeliverable {
  id: string;
  titleAr: string;
  titleEn: string;
  category: 'Structure' | 'Domain' | 'MediatR' | 'Angular' | 'Security';
  descriptionAr: string;
  descriptionEn: string;
  filePath: string;
  language: 'csharp' | 'typescript' | 'json' | 'text';
  code: string;
}

export const ARCHITECTURE_DELIVERABLES: CodeDeliverable[] = [
  // 1. Solution Structure
  {
    id: 'solution-structure',
    titleAr: '1. الهيكل المعماري الشامل للحل (Clean Architecture 4-Projects)',
    titleEn: '1. Complete Solution Clean Architecture Structure',
    category: 'Structure',
    descriptionAr: 'المخطط الهيكلي المعياري المعتمد لحل .NET 9 Clean Architecture مقسماً إلى 4 مشاريع منفصلة مع حدود صريحة للمسؤوليات والتبعيات.',
    descriptionEn: 'The full 4-project Clean Architecture solution structure for .NET 9 with clean separation of concerns and dependency inversion.',
    filePath: 'PharmaCore.sln / Solution Tree',
    language: 'text',
    code: `PharmaCore.sln
│
├── 📂 src/
│   │
│   ├── 📁 1. PharmaCore.Domain/                     # Core business logic (No external dependencies)
│   │   ├── 📁 Common/
│   │   │   ├── BaseEntity.cs                        # Id, CreatedAt, CreatedBy, UpdatedAt, IsDeleted
│   │   │   ├── IAggregateRoot.cs                    # Marker interface for Aggregate Roots
│   │   │   └── DomainEvent.cs                       # INotification abstraction
│   │   ├── 📁 Entities/
│   │   │   ├── Medicine.cs                          # Root Entity: Trade names, Active ingredient, UnitsPerBox
│   │   │   ├── BatchItem.cs                         # FEFO Batches: BatchNumber, ExpiryDate, QtyAvailable, Shelf
│   │   │   ├── DrugInteraction.cs                   # Contraindication table & risk severity levels
│   │   │   ├── SalesInvoice.cs                      # Sales Aggregate Root with items & payment details
│   │   │   ├── SalesInvoiceItem.cs                  # Line item with Batch reference & UnitType (Box/Strip)
│   │   │   ├── Shift.cs                             # Cash Drawer & Shift handover aggregate
│   │   │   └── CashTransaction.cs                   # Expenses & drawer audits
│   │   ├── 📁 Enums/
│   │   │   ├── DosageForm.cs                        # Tablets, Syrup, Injection, Patch...
│   │   │   ├── UnitType.cs                          # Box (علبة), Strip (شريط)
│   │   │   ├── InteractionSeverity.cs               # Fatal, Severe, Moderate, Minor
│   │   │   ├── PaymentMethod.cs                     # Cash, Card, HealthInsurance
│   │   │   └── ShiftStatus.cs                       # Open, Closed, Audited
│   │   └── 📁 Exceptions/
│   │       ├── InsufficientFefoStockException.cs
│   │       ├── DrugInteractionDetectedException.cs
│   │       └── ShiftNotOpenException.cs
│   │
│   ├── 📁 2. PharmaCore.Application/                # CQRS, Use Cases, MediatR, DTOs & Validation
│   │   ├── 📁 Common/
│   │   │   ├── 📁 Behaviors/
│   │   │   │   ├── ValidationBehavior.cs            # MediatR IPipelineBehavior with FluentValidation
│   │   │   │   ├── LoggingBehavior.cs               # Request profiling & correlation tracking
│   │   │   │   └── TransactionBehavior.cs          # UnitOfWork database transaction management
│   │   │   ├── 📁 Interfaces/
│   │   │   │   ├── IApplicationDbContext.cs         # EF Core DbContext contract
│   │   │   │   ├── IFefoAllocationService.cs        # FEFO stock resolution logic
│   │   │   │   ├── IDrugInteractionService.cs       # Active ingredient cross-checking
│   │   │   │   ├── ICurrentUserService.cs           # Pharmacist context from JWT claims
│   │   │   │   └── IZatcaQrCodeGenerator.cs         # TLV Base64 QR code encoding
│   │   │   └── 📁 Models/
│   │   │       └── Result.cs                        # Railway oriented programming monad
│   │   ├── 📁 Features/
│   │   │   ├── 📁 Sales/
│   │   │   │   ├── 📁 Commands/
│   │   │   │   │   ├── CreateSalesInvoiceCommand.cs # MediatR Command
│   │   │   │   │   ├── CreateSalesInvoiceHandler.cs # FEFO safe deduction inside DB transaction
│   │   │   │   │   └── CreateSalesInvoiceValidator.cs # FluentValidation rules
│   │   │   │   └── 📁 Queries/
│   │   │   │       ├── GetSalesInvoicesListQuery.cs
│   │   │   │       └── GetInvoiceByIdQuery.cs
│   │   │   ├── 📁 Inventory/
│   │   │   │   ├── 📁 Commands/ (AddBatch, AdjustStock, TransferBatch)
│   │   │   │   └── 📁 Queries/ (GetExpiringBatchesQuery - FEFO Heatmap)
│   │   │   └── 📁 Shifts/
│   │   │       ├── 📁 Commands/ (OpenShift, CloseShiftBlindCount)
│   │   │       └── 📁 Queries/ (GetCurrentShiftSummaryQuery)
│   │   └── DependencyInjection.cs                   # AddApplicationServices() extension
│   │
│   ├── 📁 3. PharmaCore.Infrastructure/             # EF Core 9, SQL Server, Identity, Redis & Cache
│   │   ├── 📁 Persistence/
│   │   │   ├── ApplicationDbContext.cs              # EF Core 9 DbContext with ChangeTracker interceptors
│   │   │   ├── 📁 Configurations/                   # Fluent API configurations (No Domain annotations)
│   │   │   │   ├── MedicineConfiguration.cs
│   │   │   │   ├── BatchItemConfiguration.cs
│   │   │   │   ├── SalesInvoiceConfiguration.cs
│   │   │   │   ├── SalesInvoiceItemConfiguration.cs
│   │   │   │   ├── ShiftConfiguration.cs
│   │   │   │   └── DrugInteractionConfiguration.cs
│   │   │   ├── 📁 Migrations/                       # EF Core Migrations
│   │   │   └── ApplicationDbContextSeed.cs          # Pre-seeded medicines, batches & interactions
│   │   ├── 📁 Identity/
│   │   │   ├── ApplicationUser.cs                   # IdentityUser with PharmacistLicenseNumber
│   │   │   ├── ApplicationRole.cs                   # Admin, Pharmacist, Cashier
│   │   │   ├── RefreshToken.cs                      # Refresh token rotation entity
│   │   │   └── JwtService.cs                        # Token generator with Claims & signing key
│   │   ├── 📁 Services/
│   │   │   ├── FefoAllocationService.cs             # Implements FEFO priority algorithm
│   │   │   ├── ZatcaQrCodeGenerator.cs              # Saudi ZATCA & ETA TLV Base64
│   │   │   └── RedisCacheService.cs                 # Barcode fast cache layer
│   │   └── DependencyInjection.cs                   # AddInfrastructureServices(configuration)
│   │
│   └── 📁 4. PharmaCore.WebAPI/                     # API Gateway, Controllers, Middlewares, SignalR
│       ├── 📁 Controllers/
│       │   ├── SalesController.cs                   # [Authorize(Policy = "CashierPolicy")]
│       │   ├── MedicinesController.cs               # Barcode lookup & alternative searching
│       │   ├── InventoryController.cs               # FEFO batch monitoring & purchase orders
│       │   ├── ShiftsController.cs                  # Blind cash count & shift closure
│       │   └── AuthController.cs                    # Login, RefreshToken, Revoke
│       ├── 📁 Middlewares/
│       │   └── GlobalExceptionHandlingMiddleware.cs # ProblemDetails RFC 7807 response
│       ├── 📁 Hubs/
│       │   └── PharmacyNotificationsHub.cs          # Real-time SignalR for stock & shift alerts
│       ├── Program.cs                               # Minimal API bootstrap & DI composition
│       └── appsettings.json                         # ConnectionStrings, JWT Secret, Redis
│
└── 📁 frontend/                                      # Angular 19 Standalone Client
    ├── 📁 src/app/
    │   ├── 📁 core/
    │   │   ├── 📁 services/
    │   │   │   ├── global-barcode-scanner.service.ts # Global keyboard input listener
    │   │   │   ├── hotkeys.service.ts               # F1-F9 pharmacy hotkeys
    │   │   │   └── auth.service.ts
    │   │   └── 📁 interceptors/
    │   │       └── auth.interceptor.ts              # Bearer token & refresh queue
    │   ├── 📁 features/
    │   │   ├── 📁 pos/
    │   │   │   ├── pos.component.ts                 # Fast POS Standalone component
    │   │   │   ├── pos.component.html               # Dual Box/Strip switch & cart
    │   │   │   └── pos.store.ts                     # Angular 19 SignalStore
    │   │   ├── 📁 inventory/ (FEFO batches, expiry tracker)
    │   │   └── 📁 shifts/ (Blind cash count modal)
    │   └── app.config.ts                            # provideHttpClient, provideRouter`
  },

  // 2. Domain Models & Fluent API Configurations
  {
    id: 'domain-and-efcore',
    titleAr: '2. كيانات الدومين وتكوينات Fluent API بـ EF Core 9',
    titleEn: '2. Domain Entities & EF Core 9 Fluent API Configurations',
    category: 'Domain',
    descriptionAr: 'كود C# النظيف للكيانات الرئيسية (Medicine, BatchItem, SalesInvoice, Shift) مع تطبيق معايير الـ DDD وفصل التكوينات بالكامل عبر IEntityTypeConfiguration<T> بدون أي تلوث للـ Domain.',
    descriptionEn: 'Pure C# Domain Entities following DDD principles, with complete EF Core 9 Fluent API configurations detached from Domain annotations.',
    filePath: 'PharmaCore.Domain/Entities & PharmaCore.Infrastructure/Persistence/Configurations',
    language: 'csharp',
    code: `// ============================================================================
// 1. Domain Entities (PharmaCore.Domain/Entities/Medicine.cs)
// ============================================================================
namespace PharmaCore.Domain.Entities;

public class Medicine : BaseEntity, IAggregateRoot
{
    public string TradeNameAr { get; private set; } = string.Empty;
    public string TradeNameEn { get; private set; } = string.Empty;
    public string ActiveIngredientAr { get; private set; } = string.Empty;
    public string ActiveIngredientEn { get; private set; } = string.Empty;
    public string Barcode { get; private set; } = string.Empty;
    public string InternalCode { get; private set; } = string.Empty;
    public string CategoryAr { get; private set; } = string.Empty;
    public string CategoryEn { get; private set; } = string.Empty;
    public DosageForm DosageForm { get; private set; }
    public int ReorderLevel { get; private set; }
    public bool RequiresPrescription { get; private set; }
    
    // عدد الأشرطة داخل العلبة الواحدة (مثلاً: 2 أو 3 أشرطة)
    public int UnitsPerBox { get; private set; } = 1;
    public decimal PricePerBox { get; private set; }
    public decimal PricePerStrip { get; private set; }

    // شحنات الأدوية بنظام FEFO
    private readonly List<BatchItem> _batches = new();
    public IReadOnlyCollection<BatchItem> Batches => _batches.AsReadOnly();

    private Medicine() { } // Required for EF Core

    public Medicine(
        string tradeNameAr,
        string tradeNameEn,
        string activeIngredientAr,
        string activeIngredientEn,
        string barcode,
        string internalCode,
        DosageForm dosageForm,
        int unitsPerBox,
        decimal pricePerBox,
        decimal pricePerStrip,
        int reorderLevel,
        bool requiresPrescription)
    {
        TradeNameAr = tradeNameAr ?? throw new ArgumentNullException(nameof(tradeNameAr));
        TradeNameEn = tradeNameEn ?? throw new ArgumentNullException(nameof(tradeNameEn));
        ActiveIngredientAr = activeIngredientAr;
        ActiveIngredientEn = activeIngredientEn;
        Barcode = barcode ?? throw new ArgumentNullException(nameof(barcode));
        InternalCode = internalCode;
        DosageForm = dosageForm;
        UnitsPerBox = unitsPerBox > 0 ? unitsPerBox : 1;
        PricePerBox = pricePerBox;
        PricePerStrip = pricePerStrip > 0 ? pricePerStrip : (pricePerBox / unitsPerBox);
        ReorderLevel = reorderLevel;
        RequiresPrescription = requiresPrescription;
    }

    public void AddBatch(BatchItem batch)
    {
        ArgumentNullException.ThrowIfNull(batch);
        _batches.Add(batch);
    }
}

// ============================================================================
// 2. BatchItem Entity - نظام FEFO (First Expire, First Out)
// ============================================================================
namespace PharmaCore.Domain.Entities;

public class BatchItem : BaseEntity
{
    public Guid MedicineId { get; private set; }
    public Medicine Medicine { get; private set; } = null!;
    
    public string BatchNumber { get; private set; } = string.Empty;
    public DateOnly ManufactureDate { get; private set; }
    public DateOnly ExpiryDate { get; private set; } // المفتاح الأساسي لترتيب الـ FEFO
    public decimal CostPrice { get; private set; }
    public decimal SellingPriceBox { get; private set; }
    public decimal SellingPriceStrip { get; private set; }
    
    // الرصيد الفعلي المتاح
    public int QuantityBoxesAvailable { get; private set; }
    public int QuantityStripsAvailable { get; private set; } // الأشرطة المفردة
    public string ShelfLocation { get; private set; } = string.Empty;

    // Concurrency Token لمنع السحب المزدوج المتزامن
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    private BatchItem() { }

    public BatchItem(
        Guid medicineId,
        string batchNumber,
        DateOnly manufactureDate,
        DateOnly expiryDate,
        decimal costPrice,
        decimal sellingPriceBox,
        decimal sellingPriceStrip,
        int quantityBoxes,
        string shelfLocation)
    {
        MedicineId = medicineId;
        BatchNumber = batchNumber;
        ManufactureDate = manufactureDate;
        ExpiryDate = expiryDate;
        CostPrice = costPrice;
        SellingPriceBox = sellingPriceBox;
        SellingPriceStrip = sellingPriceStrip;
        QuantityBoxesAvailable = quantityBoxes;
        QuantityStripsAvailable = 0;
        ShelfLocation = shelfLocation;
    }

    /// <summary>
    /// خصم المخزون مع دعم بيع العلب أو الأشرطة وفك العلب تلقائياً
    /// </summary>
    public void DeductStock(UnitType unitType, int quantity, int unitsPerBox)
    {
        if (unitType == UnitType.Box)
        {
            if (QuantityBoxesAvailable < quantity)
                throw new InsufficientFefoStockException(
                    $"الشحنة {BatchNumber} لا تحتوي على رصيد كافٍ من العلب. المتاح: {QuantityBoxesAvailable}، المطلوب: {quantity}");
            
            QuantityBoxesAvailable -= quantity;
        }
        else // UnitType.Strip
        {
            int totalStripsAvailable = (QuantityBoxesAvailable * unitsPerBox) + QuantityStripsAvailable;
            if (totalStripsAvailable < quantity)
                throw new InsufficientFefoStockException(
                    $"الشحنة {BatchNumber} لا تحتوي على رصيد أشرطة كافٍ. المتاح: {totalStripsAvailable} شريط");

            if (QuantityStripsAvailable >= quantity)
            {
                QuantityStripsAvailable -= quantity;
            }
            else
            {
                int remainingStripsNeeded = quantity - QuantityStripsAvailable;
                QuantityStripsAvailable = 0;
                
                int boxesToOpen = (int)Math.Ceiling((double)remainingStripsNeeded / unitsPerBox);
                QuantityBoxesAvailable -= boxesToOpen;
                
                int generatedStrips = boxesToOpen * unitsPerBox;
                QuantityStripsAvailable = generatedStrips - remainingStripsNeeded;
            }
        }
    }
}

// ============================================================================
// 3. EF Core 9 Fluent API Configuration (Infrastructure/Configurations/MedicineConfiguration.cs)
// ============================================================================
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PharmaCore.Domain.Entities;

namespace PharmaCore.Infrastructure.Persistence.Configurations;

public class MedicineConfiguration : IEntityTypeConfiguration<Medicine>
{
    public void Configure(EntityTypeBuilder<Medicine> builder)
    {
        builder.ToTable("Medicines", "pharmacy");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.TradeNameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(m => m.TradeNameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(m => m.ActiveIngredientAr)
            .HasMaxLength(300);

        builder.Property(m => m.ActiveIngredientEn)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(m => m.Barcode)
            .IsRequired()
            .HasMaxLength(64);

        builder.HasIndex(m => m.Barcode)
            .IsUnique()
            .HasDatabaseName("IX_Medicines_Barcode");

        builder.Property(m => m.PricePerBox)
            .HasPrecision(18, 2);

        builder.Property(m => m.PricePerStrip)
            .HasPrecision(18, 2);

        // One-to-Many Relationship with BatchItems
        builder.HasMany(m => m.Batches)
            .WithOne(b => b.Medicine)
            .HasForeignKey(b => b.MedicineId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(m => m.Batches)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class BatchItemConfiguration : IEntityTypeConfiguration<BatchItem>
{
    public void Configure(EntityTypeBuilder<BatchItem> builder)
    {
        builder.ToTable("BatchItems", "pharmacy");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.BatchNumber)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.ShelfLocation)
            .HasMaxLength(50);

        builder.Property(b => b.CostPrice)
            .HasPrecision(18, 2);

        builder.Property(b => b.SellingPriceBox)
            .HasPrecision(18, 2);

        builder.Property(b => b.SellingPriceStrip)
            .HasPrecision(18, 2);

        // Optimistic Concurrency Control using RowVersion
        builder.Property(b => b.RowVersion)
            .IsRowVersion();

        // Index on MedicineId + ExpiryDate for ultra-fast FEFO query optimization
        builder.HasIndex(b => new { b.MedicineId, b.ExpiryDate })
            .HasDatabaseName("IX_BatchItems_Medicine_FEFO");
    }
}`
  },

  // 3. MediatR CQRS Command Handler with FEFO & DB Transaction
  {
    id: 'mediatr-fefo-handler',
    titleAr: '3. معالج أمر المبيعات MediatR مع خصم FEFO داخل Database Transaction',
    titleEn: '3. MediatR Sales Command Handler with Safe FEFO Deduction in DB Transaction',
    category: 'MediatR',
    descriptionAr: 'معالج CQRS متكامل يضمن الاتساق الكامل للمخزون، السحب بترتيب تاريخ الصلاحية الأقرب، التحقق من التداخلات الدوائية الخطيرة، تشفير الـ QR Code الخاص بـ ZATCA، وتأمين العملية داخل EF Core Execution Strategy و Transaction.',
    descriptionEn: 'Full production CQRS Command Handler ensuring ACID transaction, multi-batch FEFO splitting, drug interaction safety checks, and ZATCA QR generation.',
    filePath: 'PharmaCore.Application/Features/Sales/Commands/CreateSalesInvoiceCommand.cs',
    language: 'csharp',
    code: `namespace PharmaCore.Application.Features.Sales.Commands;

using MediatR;
using Microsoft.EntityFrameworkCore;
using PharmaCore.Application.Common.Interfaces;
using PharmaCore.Domain.Entities;
using PharmaCore.Domain.Enums;
using PharmaCore.Domain.Exceptions;

// ============================================================================
// 1. Command DTOs
// ============================================================================
public record CreateSalesInvoiceCommand : IRequest<SalesInvoiceResponseDto>
{
    public Guid ShiftId { get; init; }
    public string? CustomerName { get; init; }
    public PaymentMethod PaymentMethod { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal PaidAmount { get; init; }
    public List<SalesItemDto> Items { get; init; } = new();
}

public record SalesItemDto
{
    public Guid MedicineId { get; init; }
    public UnitType UnitType { get; init; } // Box or Strip
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal DiscountPercent { get; init; }
    public Guid? PreferredBatchId { get; init; } // Optional manual override, otherwise FEFO auto
}

public record SalesInvoiceResponseDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime CreatedAt,
    decimal GrandTotal,
    string ZatcaQrCodeBase64);

// ============================================================================
// 2. MediatR Handler with FEFO Deduction & Transaction Isolation
// ============================================================================
public class CreateSalesInvoiceCommandHandler 
    : IRequestHandler<CreateSalesInvoiceCommand, SalesInvoiceResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDrugInteractionService _drugInteractionService;
    private readonly IZatcaQrCodeGenerator _zatcaQrGenerator;

    public CreateSalesInvoiceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDrugInteractionService drugInteractionService,
        IZatcaQrCodeGenerator zatcaQrGenerator)
    {
        _context = context;
        _currentUserService = currentUserService;
        _drugInteractionService = drugInteractionService;
        _zatcaQrGenerator = zatcaQrGenerator;
    }

    public async Task<SalesInvoiceResponseDto> Handle(
        CreateSalesInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Items == null || request.Items.Count == 0)
            throw new ArgumentException("لا يمكن إنشاء فاتورة مبيعات فارغة بدون أصناف.");

        // 1. التحقق من أن شيفت الصيدلي مفتوح ونشط
        var shift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.Status == ShiftStatus.Open, cancellationToken)
            ?? throw new ShiftNotOpenException("لا يوجد شيفت نشط ومفتوح لهذا الصيدلي لإتمام عملية البيع.");

        // 2. الفحص اللحظي للتداخلات الدوائية الخطيرة (Drug-Drug Interactions)
        var medicineIds = request.Items.Select(i => i.MedicineId).Distinct().ToList();
        var medicines = await _context.Medicines
            .Include(m => m.Batches)
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, cancellationToken);

        var detectedConflicts = await _drugInteractionService
            .CheckInteractionsAsync(medicineIds, cancellationToken);

        if (detectedConflicts.Any(c => c.Severity == InteractionSeverity.Fatal))
        {
            var fatal = detectedConflicts.First(c => c.Severity == InteractionSeverity.Fatal);
            throw new DrugInteractionDetectedException(
                $"تنبيه خطير جداً: تعارض دوائي مميت بين ({fatal.Medicine1Name}) و ({fatal.Medicine2Name}): {fatal.ClinicalEffectAr}");
        }

        // 3. تنفيذ العملية داخل EF Core Execution Strategy و Database Transaction
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.RepeatableRead, 
                cancellationToken);

            try
            {
                // توليد رقم الفاتورة التسلسلي
                string invoiceNumber = await GenerateNextInvoiceNumberAsync(cancellationToken);
                
                var invoice = new SalesInvoice(
                    invoiceNumber,
                    shift.Id,
                    _currentUserService.UserId,
                    _currentUserService.UserName,
                    request.CustomerName,
                    request.PaymentMethod);

                decimal subTotal = 0;

                // 4. خوارزمية السحب التلقائي بنظام FEFO (First Expire, First Out)
                foreach (var itemDto in request.Items)
                {
                    if (!medicines.TryGetValue(itemDto.MedicineId, out var medicine))
                        throw new KeyNotFoundException($"الدواء المطلوب غير موجود: {itemDto.MedicineId}");

                    int remainingToDeduct = itemDto.Quantity;

                    // جلب شحنات الدواء الصالحة مرتبة بحسب تاريخ الانتهاء تصاعدياً (FEFO)
                    var availableBatches = medicine.Batches
                        .Where(b => b.ExpiryDate >= DateOnly.FromDateTime(DateTime.UtcNow))
                        .OrderBy(b => b.ExpiryDate)
                        .ToList();

                    if (!availableBatches.Any())
                        throw new InsufficientFefoStockException(
                            $"لا توجد أي شحنات صالحة للاستهلاك للدواء: {medicine.TradeNameAr}");

                    // السحب وتوزيع الكمية على الشحنات الأقرب انتهاءً (حتى لو تجزأت الكمية على شحنتين)
                    foreach (var batch in availableBatches)
                    {
                        if (remainingToDeduct <= 0) break;

                        int availableInThisBatch = (itemDto.UnitType == UnitType.Box)
                            ? batch.QuantityBoxesAvailable
                            : (batch.QuantityBoxesAvailable * medicine.UnitsPerBox) + batch.QuantityStripsAvailable;

                        if (availableInThisBatch <= 0) continue;

                        int deductFromThisBatch = Math.Min(remainingToDeduct, availableInThisBatch);

                        // خصم المخزون
                        batch.DeductStock(itemDto.UnitType, deductFromThisBatch, medicine.UnitsPerBox);

                        // إضافة بند الفاتورة مرتبطاً برقم التشغيلة المنصرفة فعلياً
                        decimal lineTotal = deductFromThisBatch * itemDto.UnitPrice * (1 - (itemDto.DiscountPercent / 100m));
                        subTotal += lineTotal;

                        invoice.AddItem(new SalesInvoiceItem(
                            medicine.Id,
                            medicine.TradeNameAr,
                            medicine.TradeNameEn,
                            batch.BatchNumber,
                            batch.ExpiryDate,
                            itemDto.UnitType,
                            deductFromThisBatch,
                            itemDto.UnitPrice,
                            itemDto.DiscountPercent,
                            lineTotal));

                        remainingToDeduct -= deductFromThisBatch;
                    }

                    if (remainingToDeduct > 0)
                    {
                        throw new InsufficientFefoStockException(
                            $"رصيد الدواء ({medicine.TradeNameAr}) غير كافٍ لتغطية الكمية المطلوبة بالكامل بنظام FEFO.");
                    }
                }

                // 5. حساب الإجماليات وتحديث الشيفت
                invoice.ApplyTotals(subTotal, request.DiscountAmount, request.PaidAmount);
                shift.RegisterSale(request.PaymentMethod, invoice.GrandTotal);

                // 6. توليد QR Code الإلكتروني لهيئة الزكاة والضريبة والجمارك (ZATCA TLV Base64)
                string zatcaQrBase64 = _zatcaQrGenerator.GenerateQrCode(
                    sellerName: "صيدلية فارماكور المتقدمة",
                    vatNumber: "310928475600003",
                    timestamp: invoice.CreatedAt,
                    invoiceTotal: invoice.GrandTotal,
                    vatTotal: invoice.TaxAmount);

                invoice.SetZatcaQr(zatcaQrBase64);

                _context.SalesInvoices.Add(invoice);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return new SalesInvoiceResponseDto(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    invoice.CreatedAt,
                    invoice.GrandTotal,
                    zatcaQrBase64);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    private async Task<string> GenerateNextInvoiceNumberAsync(CancellationToken cancellationToken)
    {
        var count = await _context.SalesInvoices.CountAsync(cancellationToken);
        return $"INV-{DateTime.UtcNow:yyyyMMdd}-{(count + 1):D6}";
    }
}`
  },

  // 4. Angular 19 Standalone Architecture with SignalStore & Barcode Listener
  {
    id: 'angular-signalstore-pos',
    titleAr: '4. بنية Angular 19 مع SignalStore وشاشة الكاشير السريعة',
    titleEn: '4. Angular 19 Standalone Architecture with SignalStore & Barcode Scanner',
    category: 'Angular',
    descriptionAr: 'كود Angular 19 كامل يعتمد على Standalone Components، إدارة الحالة اللحظية عبر SignalStore، الاستماع التلقائي لأجهزة الباركود السريعة (USB/HID) دون الحاجة للماوس، ودعم كامل لاختصارات F1-F9.',
    descriptionEn: 'Angular 19 Standalone Component + SignalStore implementation with hardware barcode scanner listener, box/strip switcher, and pharmacy hotkeys.',
    filePath: 'frontend/src/app/features/pos/pos.store.ts & pos.component.ts',
    language: 'typescript',
    code: `// ============================================================================
// 1. Angular 19 SignalStore (pos.store.ts)
// ============================================================================
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { Medicine, CartItem, UnitType, PaymentMethod } from '../../core/models/pharmacy.models';
import { PosApiService } from '../../core/services/pos-api.service';
import { NotificationService } from '../../core/services/notification.service';

interface PosState {
  cart: CartItem[];
  selectedPaymentMethod: PaymentMethod;
  discountAmount: number;
  paidAmount: number;
  customerName: string;
  isProcessing: boolean;
  activeDrugConflicts: any[];
}

const initialState: PosState = {
  cart: [],
  selectedPaymentMethod: 'Cash',
  discountAmount: 0,
  paidAmount: 0,
  customerName: '',
  isProcessing: false,
  activeDrugConflicts: []
};

export const PosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const subTotal = computed(() =>
      store.cart().reduce((sum, item) => sum + item.lineTotal, 0)
    );
    const grandTotal = computed(() =>
      Math.max(0, subTotal() - store.discountAmount())
    );
    const changeAmount = computed(() =>
      Math.max(0, store.paidAmount() - grandTotal())
    );
    const totalItemsCount = computed(() =>
      store.cart().reduce((sum, item) => sum + item.quantity, 0)
    );

    return {
      subTotal,
      grandTotal,
      changeAmount,
      totalItemsCount
    };
  }),
  withMethods((store, posApi = inject(PosApiService), notify = inject(NotificationService)) => ({
    // إضافة صنف تلقائياً بنظام FEFO عند قراءة الباركود
    addMedicineByBarcode(barcode: string, unitType: UnitType = 'Box') {
      const medicine = posApi.lookupByBarcode(barcode);
      if (!medicine) {
        notify.error(\`الباركود (\${barcode}) غير مسجل في قاعدة الأدوية!\`);
        return;
      }

      // تخصيص الشحنة الأقرب انتهاءً (FEFO)
      const fefoBatch = posApi.allocateFefoBatch(medicine, unitType);
      if (!fefoBatch) {
        notify.warning(\`الدواء \${medicine.tradeNameAr} غير متوفر في المخزون!\`);
        return;
      }

      const currentCart = store.cart();
      const existingIndex = currentCart.findIndex(
        (i) => i.medicine.id === medicine.id && i.unitType === unitType && i.selectedBatch.id === fefoBatch.id
      );

      const unitPrice = unitType === 'Box' ? medicine.pricePerBox : medicine.pricePerStrip;

      if (existingIndex > -1) {
        const updated = [...currentCart];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          lineTotal: newQty * unitPrice
        };
        patchState(store, { cart: updated });
      } else {
        const newItem: CartItem = {
          medicine,
          selectedBatch: fefoBatch,
          unitType,
          quantity: 1,
          unitPrice,
          discountPercent: 0,
          lineTotal: unitPrice,
          isFefoAutoSelected: true
        };
        patchState(store, { cart: [newItem, ...currentCart] });
      }

      // إعادة تقييم التداخلات الدوائية بعد الإضافة
      this.recalculateDrugInteractions();
    },

    // التبديل الفوري بين العلبة والشريط (F4 Hotkey)
    toggleUnitType(index: number) {
      const currentCart = [...store.cart()];
      const item = currentCart[index];
      const targetUnit: UnitType = item.unitType === 'Box' ? 'Strip' : 'Box';
      const targetPrice = targetUnit === 'Box' ? item.medicine.pricePerBox : item.medicine.pricePerStrip;

      currentCart[index] = {
        ...item,
        unitType: targetUnit,
        unitPrice: targetPrice,
        lineTotal: item.quantity * targetPrice
      };
      patchState(store, { cart: currentCart });
    },

    recalculateDrugInteractions() {
      const conflicts = posApi.checkCartInteractions(store.cart());
      patchState(store, { activeDrugConflicts: conflicts });
    },

    clearCart() {
      patchState(store, { cart: [], discountAmount: 0, paidAmount: 0, activeDrugConflicts: [] });
    }
  }))
);

// ============================================================================
// 2. Global Barcode Scanner Service (global-barcode-scanner.service.ts)
// ============================================================================
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GlobalBarcodeScannerService {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private readonly BARCODE_CHAR_TIMEOUT_MS = 40; // أجهزة الباركود ترسل الأحرف بسرعة أقل من 30ms

  public barcodeScanned$ = new Subject<string>();

  constructor(private ngZone: NgZone) {
    this.initGlobalListener();
  }

  private initGlobalListener() {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // تجنب مقاطعة الكتابة العادية إذا كان المستخدم يكتب في حقل إدخال نصي طويل
      const target = event.target as HTMLElement;
      const isManualTextInput = target.tagName === 'INPUT' && target.getAttribute('type') === 'text';

      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastKeyTime;
      this.lastKeyTime = currentTime;

      // إذا تجاوز الوقت الفاصل 40ms فهذا إدخال يدوي بشري من الكيبورد، فنفرغ البافر
      if (timeDiff > this.BARCODE_CHAR_TIMEOUT_MS) {
        this.buffer = '';
      }

      if (event.key === 'Enter') {
        if (this.buffer.length >= 6) { // أغلب الباركودات لا تقل عن 6 خانات
          event.preventDefault();
          const scannedCode = this.buffer.trim();
          this.buffer = '';

          this.ngZone.run(() => {
            this.barcodeScanned$.next(scannedCode);
          });
        }
      } else if (event.key.length === 1) {
        this.buffer += event.key;
      }
    });
  }
}`
  },

  // 5. ASP.NET Core 9 Security & JWT Authorization
  {
    id: 'security-jwt-rbac',
    titleAr: '5. إعدادات الأمان وحماية الـ API بواسطة JWT و Policy-Based RBAC',
    titleEn: '5. ASP.NET Core 9 Security, JWT Refresh Token & Policy-Based RBAC',
    category: 'Security',
    descriptionAr: 'تكوين متكامل للـ JWT، تدوير Refresh Tokens المقاوم لإعادة الإرسال (Replay-Proof Rotation)، وحماية الـ Endpoints بسياسات موجهة لصيادلة الشيفت والكاشير والمدير.',
    descriptionEn: 'Full ASP.NET Core 9 Identity & JWT implementation with Refresh Token rotation, custom claims, and policy-based authorization.',
    filePath: 'PharmaCore.Infrastructure/Identity/JwtService.cs & Program.cs',
    language: 'csharp',
    code: `// ============================================================================
// 1. JWT Token Generator & Refresh Token Service
// ============================================================================
namespace PharmaCore.Infrastructure.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("PharmacistLicense", user.PharmacistLicenseNumber ?? string.Empty),
            new("FullName", user.FullName)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15), // Short-lived Access Token
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public RefreshToken GenerateRefreshToken(string ipAddress)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);

        return new RefreshToken
        {
            Token = Convert.ToBase64String(randomBytes),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ipAddress
        };
    }
}

// ============================================================================
// 2. Program.cs - Policy-Based Authorization & Authentication Setup
// ============================================================================
var builder = WebApplication.CreateBuilder(args);

// Add Identity & JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Secret"]!)),
        ClockSkew = TimeSpan.Zero
    };
});

// Configure Granular Policy-Based Authorization
builder.Services.AddAuthorization(options =>
{
    // فقط الصيدلي المرخص يمكنه صرف الوصفات وصرف أدوية الجدول
    options.AddPolicy("RequirePharmacist", policy =>
        policy.RequireRole("Pharmacist", "Admin")
              .RequireClaim("PharmacistLicense"));

    // شاشة الكاشير السريعة متاحة للكاشير والصيدلي
    options.AddPolicy("CashierPolicy", policy =>
        policy.RequireRole("Cashier", "Pharmacist", "Admin"));

    // إغلاق الشيفت واعتماد العجز/الزيادة مقصور على مدير الفرع أو الصيدلي الأول
    options.AddPolicy("ShiftAuditPolicy", policy =>
        policy.RequireRole("Admin", "ChiefPharmacist"));
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();`
  }
];
