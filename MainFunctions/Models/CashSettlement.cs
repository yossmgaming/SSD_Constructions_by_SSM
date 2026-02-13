using System;

namespace MainFunctions.Models
{
    public class CashSettlement
    {
        public int Id { get; set; }
        public int? ObligationHeaderId { get; set; } // null = advance
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public CashDirection Direction { get; set; }
        public string Method { get; set; } = string.Empty; // Cash, Bank, Cheque
        public EntityType FromEntityType { get; set; }
        public int? FromEntityId { get; set; }
        public EntityType ToEntityType { get; set; }
        public int? ToEntityId { get; set; }
        public string ReferenceNo { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public int? EnteredByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsReversal { get; set; }
        public int? ReversesSettlementId { get; set; }
    }
}
