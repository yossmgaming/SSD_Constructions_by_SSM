using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;

namespace MainFunctions.Services
{
    public static class FinancialProjections
    {
        public sealed class ObligationProjection
        {
            public int Id { get; set; }
            public int? ProjectId { get; set; }
            public string Type { get; set; } = string.Empty;
            public ObligationDirection Direction { get; set; }
            public string ProjectName { get; set; } = string.Empty;
            public string EntityName { get; set; } = string.Empty;
            public string Period { get; set; } = string.Empty;
            public decimal TotalLines { get; set; }
            public decimal TotalApplied { get; set; }
            public decimal Balance { get; set; }
            public string Status { get; set; } = string.Empty;
            public DateTime? DueDate { get; set; }
            public bool IsOverdue { get; set; }
        }

        public static async Task<List<ObligationProjection>> LoadObligations(AppDbContext db,
            DateTime? from, DateTime? to, string? typeFilter, string? statusFilter, string? search,
            int pageSize = 500)
        {
            var q = db.ObligationHeaders
                .Include(h => h.Lines)
                .Include(h => h.Settlements)
                .AsNoTracking()
                .AsQueryable();

            if (from.HasValue) q = q.Where(h => h.PeriodStart.Date >= from.Value.Date);
            if (to.HasValue) q = q.Where(h => h.PeriodEnd.Date <= to.Value.Date);
            if (!string.IsNullOrEmpty(typeFilter) && typeFilter != "All") q = q.Where(h => h.Type == typeFilter);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search}%";
                q = q.Where(h => EF.Functions.Like(h.Notes ?? string.Empty, pattern)
                                 || (h.ProjectId != null && db.Projects.Where(p => p.Id == h.ProjectId).Any(p => EF.Functions.Like(p.Name, pattern)))
                                 || (h.Type == "WorkerPayroll" && h.EntityId != null && db.Workers.Where(w => w.Id == h.EntityId).Any(w => EF.Functions.Like(w.FullName, pattern))));
            }

            var headers = await q.OrderByDescending(h => h.PeriodEnd).Take(pageSize).ToListAsync();

            // Preload advance applications per header
            var headerIds = headers.Select(h => h.Id).ToList();
            var applications = await db.AdvanceApplications.AsNoTracking().Where(a => headerIds.Contains(a.ObligationHeaderId)).ToListAsync();

            // Read-only recompute (no writes here)
            var projectedList = new List<ObligationProjection>();
            foreach (var h in headers)
            {
                var total = h.Lines.Sum(l => l.Amount);
                var appliedLinked = h.Settlements.Where(s => !s.IsReversal).Sum(s => s.Amount);
                var appliedAdv = applications.Where(a => a.ObligationHeaderId == h.Id).Sum(a => a.AppliedAmount);
                var applied = appliedLinked + appliedAdv;
                var status = ObligationHeader.ComputeStatus(DateTime.Today, h.DueDate, total, applied).ToString();
                var balance = total - applied;
                var isOverdue = h.DueDate.HasValue && DateTime.Today.Date > h.DueDate.Value.Date && balance > 0m;

                projectedList.Add(new ObligationProjection
                {
                    Id = h.Id,
                    ProjectId = h.ProjectId,
                    Type = h.Type,
                    Direction = h.Direction,
                    ProjectName = h.ProjectId != null ? (await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == h.ProjectId))?.Name ?? string.Empty : string.Empty,
                    EntityName = await GetEntityNameAsync(db, h.Type, h.EntityId, h.ProjectId),
                    Period = string.Format(CultureInfo.InvariantCulture, "{0:yyyy-MM-dd} to {1:yyyy-MM-dd}", h.PeriodStart, h.PeriodEnd),
                    TotalLines = total,
                    TotalApplied = applied,
                    Balance = balance,
                    Status = status,
                    DueDate = h.DueDate,
                    IsOverdue = isOverdue
                });
            }
            var projected = projectedList;

            if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "All")
                projected = projected.Where(x => x.Status == statusFilter).ToList();

            return projected;
        }
        private static async Task<string> GetEntityNameAsync(AppDbContext db, string type, int? entityId, int? projectId)
        {
            if (type == "WorkerPayroll" && entityId != null)
            {
                return (await db.Workers.AsNoTracking().FirstOrDefaultAsync(w => w.Id == entityId))?.FullName ?? string.Empty;
            }
            if (type == "MaterialPurchase" && entityId != null)
            {
                return (await db.Materials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == entityId))?.Name ?? string.Empty;
            }
            if (type == "ProjectExpense" && entityId != null)
            {
                return (await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == entityId))?.Name ?? string.Empty;
            }
            if (type == "ClientInvoice" && projectId != null)
            {
                return (await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == projectId))?.Client ?? string.Empty;
            }
            return string.Empty;
        }
    }
}
