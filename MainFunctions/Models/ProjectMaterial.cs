using System;

namespace MainFunctions.Models
{
    public class ProjectMaterial
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public int MaterialId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public string Notes { get; set; } = string.Empty;
        public Project? Project { get; set; }
        public Material? Material { get; set; }
    }
}
