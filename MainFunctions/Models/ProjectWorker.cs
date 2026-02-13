using System;

namespace MainFunctions.Models
{
    public class ProjectWorker
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public int WorkerId { get; set; }
        public DateTime? AssignedFrom { get; set; }
        public DateTime? AssignedTo { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public Project? Project { get; set; }
        public Worker? Worker { get; set; }
    }
}
