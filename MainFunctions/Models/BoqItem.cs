using System;

namespace MainFunctions.Models
{
    public class BoqItem
    {
        public int Id { get; set; }
        public int BoqId { get; set; }
        public string ItemNo { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal Rate { get; set; }
        public decimal Amount { get; set; }
        public Boq? Boq { get; set; }
    }
}
