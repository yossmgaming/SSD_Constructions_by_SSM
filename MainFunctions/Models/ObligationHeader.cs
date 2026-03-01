using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations;

namespace MainFunctions.Models
{
    public class ObligationHeader
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty; // ClientInvoice, WorkerPayroll, MaterialPurchase, ProjectExpense
        public ObligationDirection Direction { get; set; }
        public int? ProjectId { get; set; }
        public EntityType EntityType { get; set; }
        public int? EntityId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal TotalAmountSnapshot { get; set; }
        public ObligationStatus Status { get; set; }
        public bool IsLocked { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Audit
        public int? ModifiedByUserId { get; set; }
        public DateTime? ModifiedAt { get; set; }

        public List<ObligationLine> Lines { get; set; } = new();

        // Settlements directly linked to this obligation (does not include advances)
        public List<CashSettlement> Settlements { get; set; } = new();

        // Concurrency token
        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public decimal GetTotalLines() => Lines?.Sum(l => l.Amount) ?? 0m;

        public decimal GetTotalAppliedFromLinkedSettlements()
        {
            if (Settlements == null) return 0m;
            decimal total = 0m;
            foreach (var s in Settlements)
            {
                if (s.IsReversal) continue;
                total += s.Amount;
            }
            return total;
        }

        public decimal GetTotalAppliedFromAdvances(IEnumerable<AdvanceApplication> applications)
        {
            if (applications == null) return 0m;
            return applications.Where(a => a.ObligationHeaderId == Id).Sum(a => a.AppliedAmount);
        }

        public static ObligationStatus ComputeStatus(DateTime today, DateTime? dueDate, decimal total, decimal totalApplied)
        {
            var balance = total - totalApplied;
            if (balance == 0m) return ObligationStatus.Paid;
            if (totalApplied > 0m) return ObligationStatus.Partial;
            if (dueDate.HasValue && today.Date > dueDate.Value.Date) return ObligationStatus.Overdue;
            return ObligationStatus.Pending;
        }
    }
}
