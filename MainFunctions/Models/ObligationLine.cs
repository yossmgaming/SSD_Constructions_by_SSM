using System;

namespace MainFunctions.Models
{
    public class ObligationLine
    {
        public int Id { get; set; }
        public int ObligationHeaderId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitRate { get; set; }
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
