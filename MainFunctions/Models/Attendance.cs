using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace MainFunctions.Models
{
    public class Attendance
    {
        public int Id { get; set; }
        public int WorkerId { get; set; }
        public int? ProjectId { get; set; }
        public DateTime Date { get; set; }

        // Map to existing DB column until migration renames it
        [Column("Present")]
        public bool IsPresent { get; set; }

        // New persistent fields for hours
        [Column(TypeName = "NUMERIC")]
        public decimal HoursWorked { get; set; }
        public bool IsHalfDay { get; set; }

        public Worker? Worker { get; set; }
        public Project? Project { get; set; }
    }
}