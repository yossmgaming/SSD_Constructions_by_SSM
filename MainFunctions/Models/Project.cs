using System;
using System.Collections.Generic;

namespace MainFunctions.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Client { get; set; } = string.Empty;
        public decimal Budget { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<ProjectWorker> ProjectWorkers { get; set; } = new List<ProjectWorker>();
        public ICollection<ProjectMaterial> ProjectMaterials { get; set; } = new List<ProjectMaterial>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
