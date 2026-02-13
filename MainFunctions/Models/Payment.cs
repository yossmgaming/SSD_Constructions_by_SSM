using System;

namespace MainFunctions.Models
{
    public class Payment
    {
        public int Id { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public int? ProjectId { get; set; }
        public int? WorkerId { get; set; }
        public int? MaterialId { get; set; }
        public int? ClientId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal Balance { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Project? Project { get; set; }
        public Worker? Worker { get; set; }
        public Material? Material { get; set; }
    }
}
