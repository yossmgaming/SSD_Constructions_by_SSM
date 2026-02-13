using System;
using System.Collections.Generic;
using System.Linq;
using MainFunctions.Models;

namespace MainFunctions.Services
{
    public static class PayrollCalculator
    {
        // Hourly rate from daily
        public static decimal GetHourlyRate(decimal dailyRate) => decimal.Round(dailyRate / 8m, 2);

        // Resolve hours for an attendance record
        public static decimal ResolveHours(Attendance a)
        {
            if (!a.IsPresent) return 0m;
            if (a.HoursWorked > 0m) return a.HoursWorked;
            return a.IsHalfDay ? 4m : 8m;
        }

        // Compute total hours for a set of attendance rows
        public static decimal ComputeTotalHours(IEnumerable<Attendance> rows)
        {
            decimal total = 0m;
            foreach (var a in rows)
            {
                total += ResolveHours(a);
            }
            return total;
        }

        // Build per-day payment lines for a worker for a month and project
        public static IEnumerable<PaymentLine> BuildPerDayLines(IEnumerable<Attendance> rows, decimal hourlyRate)
        {
            foreach (var a in rows.OrderBy(x => x.Date))
            {
                var h = ResolveHours(a);
                if (h <= 0m) continue;
                var amount = decimal.Round(h * hourlyRate, 2);
                yield return new PaymentLine
                {
                    Date = a.Date.Date,
                    Description = $"{a.Date:yyyy-MM-dd} – {h}h @ {hourlyRate:N2}",
                    Amount = amount
                };
            }
        }
    }
}
