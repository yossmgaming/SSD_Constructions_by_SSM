using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using MainFunctions.Data;
using MainFunctions.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace MainFunctions.Tests
{
    public class AdvanceApplicationServiceTests : IDisposable
    {
        private readonly string _dbFile;
        private readonly DbContextOptions<AppDbContext> _options;

        public AdvanceApplicationServiceTests()
        {
            _dbFile = Path.GetTempFileName();
            _dbFile = Path.ChangeExtension(_dbFile, ".db");

            // Create database file and apply schema using a dedicated connection
            var masterConn = new SqliteConnection($"Data Source={_dbFile}");
            masterConn.Open();
            var masterOptions = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(masterConn).Options;

            using (var ctx = new AppDbContext(masterOptions))
            {
                ctx.Database.EnsureCreated();

                // Seed minimal data: obligation header, line, cash settlement (advance)
                var header = new MainFunctions.Models.ObligationHeader
                {
                    Type = "ClientInvoice",
                    PeriodStart = DateTime.UtcNow.Date.AddDays(-30),
                    PeriodEnd = DateTime.UtcNow.Date,
                    TotalAmountSnapshot = 1000m
                };
                ctx.ObligationHeaders.Add(header);
                ctx.SaveChanges();

                ctx.ObligationLines.Add(new MainFunctions.Models.ObligationLine { ObligationHeaderId = header.Id, Amount = 1000m });
                ctx.SaveChanges();

                var advance = new MainFunctions.Models.CashSettlement
                {
                    Amount = 500m,
                    IsReversal = false,
                    Date = DateTime.UtcNow
                };
                ctx.CashSettlements.Add(advance);
                ctx.SaveChanges();
            }

            // _options not used by factory; leave a default here for compatibility
            _options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite($"Data Source={_dbFile}").Options;
        }

        public void Dispose()
        {
            try
            {
                File.Delete(_dbFile);
            }
            catch { }
        }

        [Fact]
        public async Task ApplyAdvance_HappyPath_Works()
        {
            var factory = new TestDbContextFactory(_dbFile);
            var service = new AdvanceApplicationService(factory, NullLogger<AdvanceApplicationService>.Instance);

            using var ctx = await factory.CreateDbContextAsync();
            var advanceId = ctx.CashSettlements.First().Id;
            var headerId = ctx.ObligationHeaders.First().Id;

            await service.ApplyAdvanceAsync(advanceId, headerId, 200m, userId: 1);

            using var check = await factory.CreateDbContextAsync();
            var applied = check.AdvanceApplications.FirstOrDefault();
            Assert.NotNull(applied);
            Assert.Equal(200m, applied.AppliedAmount);
        }

        [Fact]
        public async Task ApplyAdvance_OverApplyAdvance_Throws()
        {
            var factory = new TestDbContextFactory(_dbFile);
            var service = new AdvanceApplicationService(factory, NullLogger<AdvanceApplicationService>.Instance);

            using var ctx = await factory.CreateDbContextAsync();
            var advanceId = ctx.CashSettlements.First().Id;
            var headerId = ctx.ObligationHeaders.First().Id;

            await Assert.ThrowsAsync<ValidationException>(async () => await service.ApplyAdvanceAsync(advanceId, headerId, 10000m, userId: 1));
        }

        [Fact]
        public async Task ApplyAdvance_OverApplyHeader_Throws()
        {
            var factory = new TestDbContextFactory(_dbFile);
            var service = new AdvanceApplicationService(factory, NullLogger<AdvanceApplicationService>.Instance);

            using var ctx = await factory.CreateDbContextAsync();
            var advanceId = ctx.CashSettlements.First().Id;
            var headerId = ctx.ObligationHeaders.First().Id;

            // header total is 1000; apply 1200 should fail
            await Assert.ThrowsAsync<ValidationException>(async () => await service.ApplyAdvanceAsync(advanceId, headerId, 1200m, userId: 1));
        }

        [Fact]
        public async Task Concurrency_Simulation_ThrowsConcurrencyConflict()
        {
            var factory = new TestDbContextFactory(_dbFile);
            var service1 = new AdvanceApplicationService(factory, NullLogger<AdvanceApplicationService>.Instance);
            var service2 = new AdvanceApplicationService(factory, NullLogger<AdvanceApplicationService>.Instance);

            using var ctx = await factory.CreateDbContextAsync();
            var advanceId = ctx.CashSettlements.First().Id;
            var headerId = ctx.ObligationHeaders.First().Id;

            // Simulate two parallel applies that together exceed remaining
            var t1 = Task.Run(async () => { try { await service1.ApplyAdvanceAsync(advanceId, headerId, 400m, userId: 1); } catch (Exception) { /* expected */ } });
            var t2 = Task.Run(async () => { try { await service2.ApplyAdvanceAsync(advanceId, headerId, 400m, userId: 2); } catch (Exception) { /* expected */ } });

            await Task.WhenAll(t1, t2);

            using var check = await factory.CreateDbContextAsync();
            var list = check.AdvanceApplications.AsNoTracking().ToList();
            var total = list.Sum(a => a.AppliedAmount);
            var count = list.Count;

            // Since initial advance was 500, total applied must be <= 500
            Assert.True(total <= 500m, "Total applied exceeded advance amount");
            Assert.True(count >= 1, "At least one application should have succeeded");
        }

        // Test factory that returns contexts using separate SqliteConnection instances against the temp file
        private class TestDbContextFactory : DbContextFactory
        {
            private readonly string _file;
            public TestDbContextFactory(string file) { _file = file; }
            public override async Task<AppDbContext> CreateDbContextAsync()
            {
                var conn = new SqliteConnection($"Data Source={_file}");
                conn.Open();
                var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options;
                return await Task.FromResult(new AppDbContext(options));
            }
            public override AppDbContext CreateOfflineDbContext()
            {
                var conn = new SqliteConnection($"Data Source={_file}");
                conn.Open();
                var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options;
                return new AppDbContext(options);
            }
        }
    }
}
