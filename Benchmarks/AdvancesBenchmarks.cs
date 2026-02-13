using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using BenchmarkDotNet.Attributes;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;

namespace Benchmarks
{
    [MemoryDiagnoser]
    public class AdvancesBenchmarks
    {
        private SqliteConnection _connection = null!;
        private DbContextOptions<AppDbContext> _options = null!;
        private static int s_threadSeedCounter;
        private static readonly ThreadLocal<Random> s_rng = new ThreadLocal<Random>(() => new Random(Interlocked.Increment(ref s_threadSeedCounter)));

        private List<int> _advanceIds = new List<int>();
        private DateTime _seedTime;

        [GlobalSetup]
        public void Setup()
        {
            // Keep the in-memory SQLite connection open so DB persists for the benchmark lifetime
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            _options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;

            s_threadSeedCounter = 12345;
            _seedTime = DateTime.UtcNow;

            using (var db = new AppDbContext(_options))
            {
                db.Database.EnsureCreated();

                // Seed advances
                var advances = new List<CashSettlement>(capacity: 1000);
                for (int i = 0; i < 1000; i++)
                {
                    advances.Add(new CashSettlement
                    {
                        Date = _seedTime.AddDays(-i),
                        Amount = 100 + (i % 50),
                        Direction = CashDirection.In,
                        FromEntityType = EntityType.Supplier,
                        Notes = "seed",
                        CreatedAt = _seedTime
                    });
                }

                db.CashSettlements.AddRange(advances);
                db.SaveChanges();

                _advanceIds = db.CashSettlements.AsNoTracking()
                    .Where(s => s.ObligationHeaderId == null && !s.IsReversal)
                    .Select(s => s.Id)
                    .ToList();

                // Seed advance applications
                var apps = new List<AdvanceApplication>(capacity: 5000);
                var rngLocal = s_rng.Value!;
                for (int i = 0; i < 5000; i++)
                {
                    var advanceId = _advanceIds[rngLocal.Next(_advanceIds.Count)];
                    apps.Add(new AdvanceApplication
                    {
                        AdvanceSettlementId = advanceId,
                        ObligationHeaderId = 1 + (i % 10),
                        AppliedAmount = (decimal)(rngLocal.NextDouble() * 10.0),
                        CreatedAt = _seedTime
                    });
                }

                db.AdvanceApplications.AddRange(apps);
                db.SaveChanges();
            }

            // Warm EF Core query compilation and caches
            using (var db = new AppDbContext(_options))
            {
                var warmAdvances = db.CashSettlements.AsNoTracking()
                    .Where(s => s.ObligationHeaderId == null && !s.IsReversal)
                    .OrderByDescending(s => s.Date)
                    .ToList();

                var advanceIds = warmAdvances.Select(a => a.Id).ToList();

                var warmApps = db.AdvanceApplications.AsNoTracking()
                    .Where(x => advanceIds.Contains(x.AdvanceSettlementId))
                    .ToList();

                var _ = warmApps
                    .GroupBy(a => a.AdvanceSettlementId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.AppliedAmount));
            }
        }

        [GlobalCleanup]
        public void Cleanup()
        {
            _connection?.Close();
            _connection?.Dispose();
        }

        [Benchmark]
        public void LoadAdvances_InMemoryAggregation()
        {
            using var db = new AppDbContext(_options);

            var advances = db.CashSettlements.AsNoTracking()
                .Where(s => s.ObligationHeaderId == null && !s.IsReversal)
                .OrderByDescending(s => s.Date)
                .ToList();

            var advanceIds = advances.Select(a => a.Id).ToList();
            var apps = db.AdvanceApplications.AsNoTracking()
                .Where(x => advanceIds.Contains(x.AdvanceSettlementId))
                .ToList();

            var appliedByAdvance = apps
                .GroupBy(a => a.AdvanceSettlementId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.AppliedAmount));

            var rows = advances.Select(a => new
            {
                Id = a.Id,
                Date = a.Date,
                FromEntityLabel = a.FromEntityType.ToString(),
                Direction = a.Direction,
                OriginalAmount = a.Amount,
                AppliedAmount = appliedByAdvance.TryGetValue(a.Id, out var sum) ? sum : 0m,
                Notes = a.Notes
            }).ToList();

            GC.KeepAlive(rows);
        }

        [Benchmark]
        public void ApplyAdvance_Insert()
        {
            using var db = new AppDbContext(_options);
            using var tx = db.Database.BeginTransaction();

            var rngLocal = s_rng.Value!;
            var advanceId = _advanceIds[rngLocal.Next(_advanceIds.Count)];
            var app = new AdvanceApplication
            {
                AdvanceSettlementId = advanceId,
                ObligationHeaderId = 1,
                AppliedAmount = 1.0m,
                CreatedAt = DateTime.UtcNow
            };
            db.AdvanceApplications.Add(app);
            db.SaveChanges();

            tx.Rollback();
            GC.KeepAlive(app);
        }
    }
}
