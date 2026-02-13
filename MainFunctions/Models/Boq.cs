using System;
using System.Collections.Generic;

namespace MainFunctions.Models
{
    public class Boq
    {
        public int Id { get; set; }
        public int? ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime? DocumentDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Project? Project { get; set; }
        public ICollection<BoqItem> Items { get; set; } = new List<BoqItem>();
    }
}
