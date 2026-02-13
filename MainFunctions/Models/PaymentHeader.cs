using System;
using System.Collections.Generic;
using System.Linq;

namespace MainFunctions.Models
{
    // Append-only header for a payment batch (e.g., worker monthly payroll)
    public class PaymentHeader
    {
        public int Id { get; set; }
        // Type: WorkerPayroll, MaterialInvoice, ProjectExpense, ClientInvoice, etc.
        public string Type { get; set; } = string.Empty;
        // EntityId: WorkerId / MaterialId / ClientId depending on Type
        public int EntityId { get; set; }
        // Project scope for payroll uniqueness and filtering
        public int? ProjectId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        // Source: e.g., Attendance, Manual, Import
        public string Source { get; set; } = "Attendance";
        // Status: Pending, Partial, Paid, Overdue, Locked (computed; persisted for quick filter)
        public string Status { get; set; } = "Pending";
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DueDate { get; set; }

        public List<PaymentLine> Lines { get; set; } = new();
        public List<Settlement> Settlements { get; set; } = new();

        // Helpers (Step 1): computed totals and status
        public decimal GetTotalLines() => Lines?.Sum(l => l.Amount) ?? 0m;
        public decimal GetTotalSettlements() => Settlements?.Sum(s => s.Amount) ?? 0m;
        public decimal GetBalance() => GetTotalLines() - GetTotalSettlements();
        public string GetComputedStatus(DateTime todayUtc)
        {
            var balance = GetBalance();
            if (balance == 0m) return "Paid";
            var settlements = GetTotalSettlements();
            if (balance > 0m && settlements > 0m) return "Partial";
            if (balance > 0m && DueDate.HasValue && todayUtc.Date > DueDate.Value.Date) return "Overdue";
            return "Pending";
        }

        public bool IsLocked(DateTime todayUtc) => GetComputedStatus(todayUtc) == "Paid";
    }
}
