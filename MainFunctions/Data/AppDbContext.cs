using Microsoft.EntityFrameworkCore;
using MainFunctions.Models;

namespace MainFunctions.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<Project> Projects { get; set; }
        public DbSet<Worker> Workers { get; set; }
        public DbSet<Material> Materials { get; set; }
        public DbSet<ProjectWorker> ProjectWorkers { get; set; }
        public DbSet<ProjectMaterial> ProjectMaterials { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<PaymentHeader> PaymentHeaders { get; set; }
        public DbSet<PaymentLine> PaymentLines { get; set; }
        public DbSet<Settlement> Settlements { get; set; }
        public DbSet<Boq> Boqs { get; set; }
        public DbSet<BoqItem> BoqItems { get; set; }
        public DbSet<Attendance> Attendances { get; set; }

        // New domain sets
        public DbSet<ObligationHeader> ObligationHeaders { get; set; }
        public DbSet<ObligationLine> ObligationLines { get; set; }
        public DbSet<CashSettlement> CashSettlements { get; set; }
        public DbSet<AdvanceApplication> AdvanceApplications { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }


        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Configuration is now handled by the DbContextFactory
            // and passed into the constructor.
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure decimal / numeric mapping
            modelBuilder.Entity<Project>().Property(p => p.Budget).HasColumnType("NUMERIC");

            modelBuilder.Entity<Worker>().Property(w => w.DailyRate).HasColumnType("NUMERIC");

            modelBuilder.Entity<Material>().Property(m => m.Quantity).HasColumnType("NUMERIC");
            modelBuilder.Entity<Material>().Property(m => m.Cost).HasColumnType("NUMERIC");

            modelBuilder.Entity<ProjectMaterial>().Property(pm => pm.Quantity).HasColumnType("NUMERIC");
            modelBuilder.Entity<ProjectMaterial>().Property(pm => pm.UnitCost).HasColumnType("NUMERIC");

            modelBuilder.Entity<Payment>().Property(p => p.TotalAmount).HasColumnType("NUMERIC");
            modelBuilder.Entity<Payment>().Property(p => p.PaidAmount).HasColumnType("NUMERIC");
            modelBuilder.Entity<Payment>().Property(p => p.Balance).HasColumnType("NUMERIC");

            modelBuilder.Entity<PaymentLine>().Property(pl => pl.Amount).HasColumnType("NUMERIC");
            modelBuilder.Entity<Settlement>().Property(s => s.Amount).HasColumnType("NUMERIC");

            modelBuilder.Entity<BoqItem>().Property(b => b.Quantity).HasColumnType("NUMERIC");
            modelBuilder.Entity<BoqItem>().Property(b => b.Rate).HasColumnType("NUMERIC");
            modelBuilder.Entity<BoqItem>().Property(b => b.Amount).HasColumnType("NUMERIC");

            modelBuilder.Entity<Attendance>().Property(a => a.HoursWorked).HasColumnType("NUMERIC");

            // Relationships
            modelBuilder.Entity<ProjectWorker>()
                .HasOne(pw => pw.Project)
                .WithMany(p => p.ProjectWorkers)
                .HasForeignKey(pw => pw.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectWorker>()
                .HasOne(pw => pw.Worker)
                .WithMany(w => w.ProjectWorkers)
                .HasForeignKey(pw => pw.WorkerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectMaterial>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.ProjectMaterials)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectMaterial>()
                .HasOne(pm => pm.Material)
                .WithMany(m => m.ProjectMaterials)
                .HasForeignKey(pm => pm.MaterialId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BoqItem>()
                .HasOne(bi => bi.Boq)
                .WithMany(b => b.Items)
                .HasForeignKey(bi => bi.BoqId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Worker)
                .WithMany()
                .HasForeignKey(a => a.WorkerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Project)
                .WithMany()
                .HasForeignKey(a => a.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            // Unique index to prevent duplicates per worker/project/date
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.WorkerId, a.ProjectId, a.Date })
                .IsUnique();
            // Additional indices for performance
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.WorkerId, a.Date });
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.ProjectId, a.Date });

            // Payment domain relations
            modelBuilder.Entity<PaymentLine>()
                .HasOne(pl => pl.Header)
                .WithMany(h => h.Lines)
                .HasForeignKey(pl => pl.PaymentHeaderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Settlement>()
                .HasOne(s => s.Header)
                .WithMany(h => h.Settlements)
                .HasForeignKey(s => s.PaymentHeaderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Uniqueness guard for payroll headers including project scope
            modelBuilder.Entity<PaymentHeader>()
                .HasIndex(h => new { h.Type, h.EntityId, h.ProjectId, h.PeriodStart, h.PeriodEnd })
                .IsUnique();

            // New domain mapping
            modelBuilder.Entity<ObligationHeader>().Property(x => x.TotalAmountSnapshot).HasColumnType("NUMERIC");
            modelBuilder.Entity<ObligationHeader>().Property(x => x.Direction).HasConversion<string>();
            modelBuilder.Entity<ObligationHeader>().Property(x => x.EntityType).HasConversion<string>();
            modelBuilder.Entity<ObligationHeader>().Property(x => x.Status).HasConversion<string>();

            modelBuilder.Entity<ObligationLine>().Property(x => x.Quantity).HasColumnType("NUMERIC");
            modelBuilder.Entity<ObligationLine>().Property(x => x.UnitRate).HasColumnType("NUMERIC");
            modelBuilder.Entity<ObligationLine>().Property(x => x.Amount).HasColumnType("NUMERIC");

            modelBuilder.Entity<CashSettlement>().Property(x => x.Amount).HasColumnType("NUMERIC");
            modelBuilder.Entity<CashSettlement>().Property(x => x.Direction).HasConversion<string>();
            modelBuilder.Entity<CashSettlement>().Property(x => x.FromEntityType).HasConversion<string>();
            modelBuilder.Entity<CashSettlement>().Property(x => x.ToEntityType).HasConversion<string>();

            modelBuilder.Entity<ObligationHeader>()
                .HasIndex(h => new { h.Type, h.EntityId, h.ProjectId, h.PeriodStart, h.PeriodEnd })
                .IsUnique();

            modelBuilder.Entity<ObligationLine>()
                .HasOne<ObligationHeader>()
                .WithMany(h => h.Lines)
                .HasForeignKey(l => l.ObligationHeaderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CashSettlement>()
                .HasOne<ObligationHeader>()
                .WithMany(h => h.Settlements)
                .HasForeignKey(s => s.ObligationHeaderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AdvanceApplication>()
                .Property(a => a.AppliedAmount)
                .HasColumnType("NUMERIC");

            modelBuilder.Entity<AdvanceApplication>()
                .HasIndex(a => a.AdvanceSettlementId);
            modelBuilder.Entity<AdvanceApplication>()
                .HasIndex(a => a.ObligationHeaderId);

            // Supplier mapping
            modelBuilder.Entity<Supplier>().Property(s => s.IsActive).HasConversion<int>();

            base.OnModelCreating(modelBuilder);
        }
    }
}
