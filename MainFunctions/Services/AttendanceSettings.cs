using System;
using System.Collections.Generic;

namespace MainFunctions.Services
{
    public static class AttendanceSettings
    {
        // If false, weekends are excluded from assigned/present/absent counts and exports
        public static bool CountWeekends { get; set; } = true;

        // Optional holiday dates (Date-only)
        public static HashSet<DateTime> Holidays { get; } = new HashSet<DateTime>();

        public static bool IsCountedDay(DateTime date)
        {
            var d = date.Date;
            if (!CountWeekends && (d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday))
                return false;
            if (Holidays.Contains(d))
                return false;
            return true;
        }
    }
}
