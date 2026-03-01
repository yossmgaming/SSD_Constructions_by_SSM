using System;
using System.ComponentModel.DataAnnotations;

namespace MainFunctions.Models
{
    public class AdvanceApplication
    {
        public int Id { get; set; }
        public int AdvanceSettlementId { get; set; }
        public int ObligationHeaderId { get; set; }
        public decimal AppliedAmount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Audit
        public int? CreatedByUserId { get; set; }

        // Concurrency token
        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
