using System;

namespace MainFunctions.Models
{
    // Append-only settlement (payment made against a header)
    public class Settlement
    {
        public int Id { get; set; }
        public int PaymentHeaderId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty; // Cash, Bank, Cheque, etc.

        public PaymentHeader? Header { get; set; }
    }
}
