using System;
using System.Collections.Generic;
using System.Linq;
using MainFunctions.Data;
using MainFunctions.Models;
using Microsoft.EntityFrameworkCore;

namespace MainFunctions.Services
{
    public static class AssignmentReconciler
    {
        // Normalize assignments for a month; if workerId is null, process all workers with activity in the month
        public static async Task ReconcileMonth(AppDbContext db, DateTime monthStart, int? workerId = null)
        {
            var start = new DateTime(monthStart.Year, monthStart.Month, 1).Date;
            var end = start.AddMonths(1).AddDays(-1).Date;

            var workerIds = workerId.HasValue
                ? new List<int> { workerId.Value }
                : await db.ProjectWorkers.AsNoTracking()
                    .Where(pw => (pw.AssignedFrom == null || pw.AssignedFrom <= end) && (pw.AssignedTo == null || pw.AssignedTo >= start))
                    .Select(pw => pw.WorkerId)
                    .Distinct()
                    .ToListAsync();

            foreach (var wid in workerIds)
                await ReconcileWorkerMonth(db, wid, start, end);
        }

        private static async Task ReconcileWorkerMonth(AppDbContext db, int workerId, DateTime start, DateTime end)
        {
            var rows = await db.ProjectWorkers
                .Where(pw => pw.WorkerId == workerId && (pw.AssignedFrom == null || pw.AssignedFrom <= end) && (pw.AssignedTo == null || pw.AssignedTo >= start))
                .ToListAsync();

            if (!rows.Any()) return;

            // Build preferred project per day (latest AssignedFrom wins on conflicts)
            var dayProject = new Dictionary<DateTime, int>();
            foreach (var pw in rows)
            {
                var s = (pw.AssignedFrom ?? DateTime.MinValue).Date < start ? start : (pw.AssignedFrom ?? DateTime.MinValue).Date;
                var e = (pw.AssignedTo ?? DateTime.MaxValue).Date > end ? end : (pw.AssignedTo ?? DateTime.MaxValue).Date;
                if (e < s) continue;

                for (var d = s; d <= e; d = d.AddDays(1))
                {
                    if (!dayProject.TryGetValue(d, out var existingPid))
                    {
                        dayProject[d] = pw.ProjectId;
                    }
                    else
                    {
                        var existingRow = rows.First(r => r.ProjectId == existingPid && (r.AssignedFrom ?? DateTime.MinValue) <= d && (r.AssignedTo ?? DateTime.MaxValue) >= d);
                        if ((pw.AssignedFrom ?? DateTime.MinValue) > (existingRow.AssignedFrom ?? DateTime.MinValue))
                            dayProject[d] = pw.ProjectId;
                    }
                }
            }

            // Collapse back to intervals per project
            var newIntervals = new List<ProjectWorker>();
            foreach (var grp in dayProject.OrderBy(kv => kv.Key).GroupBy(kv => kv.Value))
            {
                var pid = grp.Key;
                var dates = grp.Select(x => x.Key).OrderBy(x => x).ToList();
                DateTime? curStart = null;
                DateTime? last = null;
                foreach (var d in dates)
                {
                    if (curStart == null) { curStart = d; last = d; continue; }
                    if (d == last!.Value.AddDays(1)) { last = d; continue; }

                    newIntervals.Add(new ProjectWorker { WorkerId = workerId, ProjectId = pid, AssignedFrom = curStart.Value, AssignedTo = last!.Value });
                    curStart = d; last = d;
                }
                if (curStart != null)
                    newIntervals.Add(new ProjectWorker { WorkerId = workerId, ProjectId = pid, AssignedFrom = curStart.Value, AssignedTo = last!.Value });
            }

            // Remove/trim old within month
            foreach (var pw in rows)
            {
                var s = (pw.AssignedFrom ?? DateTime.MinValue).Date;
                var e = (pw.AssignedTo ?? DateTime.MaxValue).Date;

                if (s >= start && e <= end)
                {
                    db.ProjectWorkers.Remove(pw);
                    continue;
                }

                if (s < start && e >= start && e <= end)
                {
                    pw.AssignedTo = start.AddDays(-1);
                    db.ProjectWorkers.Update(pw);
                    continue;
                }
                if (s >= start && s <= end && e > end)
                {
                    pw.AssignedFrom = end.AddDays(1);
                    db.ProjectWorkers.Update(pw);
                    continue;
                }
                // If s < start && e > end -> leave as is (spans across month); we'll fill the month region with normalized rows
            }

            foreach (var it in newIntervals)
                db.ProjectWorkers.Add(it);

            await db.SaveChangesAsync();
        }    }
}
