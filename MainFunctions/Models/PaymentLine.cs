using System;

namespace MainFunctions.Models
{
    // Append-only line item within a payment header
    public class PaymentLine
    {
        public int Id { get; set; }
        public int PaymentHeaderId { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }

        public PaymentHeader? Header { get; set; }
    }
}
