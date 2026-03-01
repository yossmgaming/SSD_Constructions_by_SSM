using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MainFunctions.Data;
using MainFunctions.Models;

namespace MainFunctions.Services
{
    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }

    public class ConcurrencyConflictException : Exception
    {
        public ConcurrencyConflictException(string message) : base(message) { }
    }

    public class AdvanceApplicationService : IAdvanceApplicationService
    {
        private readonly DbContextFactory _factory;
        private readonly ILogger<AdvanceApplicationService> _logger;

        public AdvanceApplicationService(DbContextFactory factory, ILogger<AdvanceApplicationService> logger)
        {
            _factory = factory;
            _logger = logger;
        }

        public async Task ApplyAdvanceAsync(int advanceId, int obligationHeaderId, decimal amount, int userId)
        {
            if (amount <= 0m) throw new ValidationException("Amount must be greater than zero.");

            _logger.LogInformation("Attempting to apply advance {AdvanceId} to header {HeaderId} amount {Amount}", advanceId, obligationHeaderId, amount);

            // Create a context using online-first strategy
            var db = await _factory.CreateDbContextAsync();

            // Choose isolation level based on provider
            var forPostgres = db.Database.ProviderName?.Contains("Npgsql") == true;
            var isolation = forPostgres ? IsolationLevel.Serializable : IsolationLevel.ReadCommitted;

            await using var tx = await db.Database.BeginTransactionAsync(isolation);
            try
            {
                // Recompute remaining for the advance inside transaction
                var settlement = await db.CashSettlements.AsNoTracking().FirstOrDefaultAsync(s => s.Id == advanceId);
                decimal remValue;

                var appliedListForAdvance = await db.AdvanceApplications.AsNoTracking()
                    .Where(a => a.AdvanceSettlementId == advanceId)
                    .Select(a => a.AppliedAmount)
                    .ToListAsync();

                var appliedSumForAdvance = appliedListForAdvance.Any() ? appliedListForAdvance.Sum() : 0m;

                if (settlement != null)
                {
                    remValue = settlement.Amount - appliedSumForAdvance;
                }
                else
                {
                    // If settlement missing treat remaining as negative to block application
                    remValue = 0m - appliedSumForAdvance;
                }

                if (amount > remValue)
                {
                    _logger.LogWarning("Validation failed: amount {Amount} exceeds remaining {Remaining}", amount, remValue);
                    throw new ValidationException("Amount exceeds remaining balance.");
                }

                // Per-obligation cap: cannot exceed header balance
                var header = await db.ObligationHeaders.Include(h => h.Lines).FirstAsync(h => h.Id == obligationHeaderId);

                var settlementsAmounts = await db.CashSettlements.AsNoTracking()
                    .Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal)
                    .Select(s => s.Amount)
                    .ToListAsync();
                var settlementsSum = settlementsAmounts.Any() ? settlementsAmounts.Sum() : 0m;

                var appliedAmountsToHeader = await db.AdvanceApplications.AsNoTracking()
                    .Where(a => a.ObligationHeaderId == header.Id)
                    .Select(a => a.AppliedAmount)
                    .ToListAsync();
                var appliedToHeaderSum = appliedAmountsToHeader.Any() ? appliedAmountsToHeader.Sum() : 0m;

                var appliedToHeader = settlementsSum + appliedToHeaderSum;
                var headerBalance = header.Lines.Sum(l => l.Amount) - appliedToHeader;

                if (amount > headerBalance)
                {
                    _logger.LogWarning("Validation failed: amount {Amount} exceeds header balance {HeaderBalance}", amount, headerBalance);
                    throw new ValidationException("Amount exceeds header balance.");
                }

                var entity = new AdvanceApplication
                {
                    AdvanceSettlementId = advanceId,
                    ObligationHeaderId = header.Id,
                    AppliedAmount = amount,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = userId
                };

                db.AdvanceApplications.Add(entity);
                await db.SaveChangesAsync();

                await tx.CommitAsync();

                _logger.LogInformation("Advance applied successfully: {Id}", entity.Id);
            }
            catch (DbUpdateConcurrencyException dex)
            {
                _logger.LogWarning(dex, "Concurrency conflict while applying advance");
                await tx.RollbackAsync();
                throw new ConcurrencyConflictException("A concurrency conflict occurred while applying the advance.");
            }
            catch (ValidationException)
            {
                await tx.RollbackAsync();
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while applying advance");
                await tx.RollbackAsync();
                throw;
            }
            finally
            {
                await db.DisposeAsync();
            }
        }
    }
}
