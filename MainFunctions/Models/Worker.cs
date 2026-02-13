using System;
using System.Collections.Generic;

namespace MainFunctions.Models
{
    public class Worker
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string NIC { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public decimal DailyRate { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Phone2 { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<ProjectWorker> ProjectWorkers { get; set; } = new List<ProjectWorker>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
