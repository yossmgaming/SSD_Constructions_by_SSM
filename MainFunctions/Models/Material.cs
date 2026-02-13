using System;
using System.Collections.Generic;

namespace MainFunctions.Models
{
    public class Material
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal Cost { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<ProjectMaterial> ProjectMaterials { get; set; } = new List<ProjectMaterial>();
    }
}
