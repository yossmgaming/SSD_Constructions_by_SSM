using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;
using System.Collections.Generic;

namespace MainFunctions.Views
{
    public partial class WorkerPayrollView : UserControl
    {
        private AppDbContext? _db;
        private const int DefaultDueDays = 7; // could be configurable

        public WorkerPayrollView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            ProjectCombo.SelectionChanged += OnProjectChanged;
            WorkerCombo.SelectionChanged += OnWorkerChanged;
            PeriodStartPicker.SelectedDateChanged += OnPeriodChanged;
            PeriodEndPicker.SelectedDateChanged += OnPeriodChanged;
            CreateHeaderButton.Click += OnCreateHeader;

            // initial disabled
            CreateHeaderButton.IsEnabled = false;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureWorkerSchema(_db); } catch { }
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }
            await LoadProjects();
        }

        private async Task LoadProjects()
        {
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            ProjectCombo.ItemsSource = projects;
            ProjectCombo.DisplayMemberPath = "Name";
            ProjectCombo.SelectedValuePath = "Id";
        }

        private async void OnProjectChanged(object sender, SelectionChangedEventArgs e)
        {
            await LoadWorkersForProject();
            await RefreshAttendance();
            await UpdateCreateEnabled();
        }

        private async void OnWorkerChanged(object sender, SelectionChangedEventArgs e)
        {
            await RefreshAttendance();
            await UpdateCreateEnabled();
        }

        private async void OnPeriodChanged(object? sender, SelectionChangedEventArgs e)
        {
            await RefreshAttendance();
            await UpdateCreateEnabled();
        }

        private async Task LoadWorkersForProject()
        {
            var pid = ProjectCombo.SelectedValue as int?;
            if (!pid.HasValue)
            {
                WorkerCombo.ItemsSource = null;
                return;
            }

            var workers = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.ProjectId == pid.Value)
                .Select(pw => pw.WorkerId)
                .Distinct()
                .Join(_db.Workers.AsNoTracking(), id => id, w => w.Id, (id, w) => new { w.Id, w.FullName })
                .OrderBy(x => x.FullName)
                .ToListAsync();
            WorkerCombo.ItemsSource = workers;
            WorkerCombo.DisplayMemberPath = "FullName";
            WorkerCombo.SelectedValuePath = "Id";
        }

        private sealed class AttendanceRow
        {
            public DateTime Date { get; set; }
            public decimal HoursWorked { get; set; }
            public bool IsHalfDay { get; set; }
            public decimal DailyAmount { get; set; }
            public string Description { get; set; } = string.Empty;
        }

        private async Task RefreshAttendance()
        {
            var pid = ProjectCombo.SelectedValue as int?;
            var wid = WorkerCombo.SelectedValue as int?;
            var start = PeriodStartPicker.SelectedDate;
            var end = PeriodEndPicker.SelectedDate;
            if (!pid.HasValue || !wid.HasValue || !start.HasValue || !end.HasValue)
            {
                AttendanceGrid.ItemsSource = null;
                TotalAmountText.Text = string.Empty;
                return;
            }

            var worker = await _db.Workers.AsNoTracking().FirstOrDefaultAsync(w => w.Id == wid.Value);
            if (worker == null)
            {
                AttendanceGrid.ItemsSource = null;
                TotalAmountText.Text = string.Empty;
                return;
            }

            var hourlyRate = PayrollCalculator.GetHourlyRate(worker.DailyRate);

            var attendances = await _db.Attendances.AsNoTracking()
                .Where(a => a.WorkerId == wid.Value && a.ProjectId == pid.Value && a.Date.Date >= start.Value.Date && a.Date.Date <= end.Value.Date)
                .OrderBy(a => a.Date)
                .ToListAsync();

            var rows = new List<AttendanceRow>();
            decimal total = 0m;
            foreach (var a in attendances)
            {
                var hours = PayrollCalculator.ResolveHours(a);
                if (hours <= 0m) continue;
                var amount = decimal.Round(hours * hourlyRate, 2);
                rows.Add(new AttendanceRow
                {
                    Date = a.Date.Date,
                    HoursWorked = hours,
                    IsHalfDay = a.IsHalfDay,
                    DailyAmount = amount,
                    Description = $"{a.Date:yyyy-MM-dd} � {hours}h @ {hourlyRate:N2}"
                });
                total += amount;
            }

            AttendanceGrid.ItemsSource = rows;
            TotalAmountText.Text = total.ToString("N2", CultureInfo.CurrentCulture);
        }

        private async Task UpdateCreateEnabled()
        {
            var pid = ProjectCombo.SelectedValue as int?;
            var wid = WorkerCombo.SelectedValue as int?;
            var start = PeriodStartPicker.SelectedDate;
            var end = PeriodEndPicker.SelectedDate;

            // enable only when project, worker, and period are selected and attendance exists
            bool enable = pid.HasValue && wid.HasValue && start.HasValue && end.HasValue;
            if (enable)
            {
                var attendances = await _db.Attendances.AsNoTracking()
                    .Where(a => a.WorkerId == wid.Value && a.ProjectId == pid.Value && a.Date.Date >= start.Value.Date && a.Date.Date <= end.Value.Date)
                    .AnyAsync();
                enable = attendances;
            }

            CreateHeaderButton.IsEnabled = enable;
        }

        private async void OnCreateHeader(object sender, RoutedEventArgs e)
        {
            try
            {
                var pid = ProjectCombo.SelectedValue as int?;
                var wid = WorkerCombo.SelectedValue as int?;
                var start = PeriodStartPicker.SelectedDate;
                var end = PeriodEndPicker.SelectedDate;
                if (!pid.HasValue || !wid.HasValue || !start.HasValue || !end.HasValue)
                {
                    MessageBox.Show("Select project, period, and worker.");
                    return;
                }

                var hourlyRate = PayrollCalculator.GetHourlyRate((await _db.Workers.AsNoTracking().FirstAsync(w => w.Id == wid.Value)).DailyRate);
                var attendances = await _db.Attendances.AsNoTracking()
                    .Where(a => a.WorkerId == wid.Value && a.ProjectId == pid.Value && a.Date.Date >= start.Value.Date && a.Date.Date <= end.Value.Date)
                    .OrderBy(a => a.Date)
                    .ToListAsync();

                if (!attendances.Any())
                {
                    MessageBox.Show("No attendance in the selected period.");
                    return;
                }

                var exists = await _db.ObligationHeaders.AsNoTracking()
                    .AnyAsync(h => h.Type == "WorkerPayroll" && h.EntityId == wid.Value && h.ProjectId == pid.Value && h.PeriodStart == start.Value.Date && h.PeriodEnd == end.Value.Date);
                if (exists)
                {
                    MessageBox.Show("Payroll already exists for worker and period.");
                    return;
                }

                await using var tx = await _db.Database.BeginTransactionAsync();

                var noteRef = string.IsNullOrWhiteSpace(PayrollReferenceBox.Text) ? string.Empty : $"Ref: {PayrollReferenceBox.Text.Trim()} Sat??";

                var header = new ObligationHeader
                {
                    Type = "WorkerPayroll",
                    Direction = ObligationDirection.Payable,
                    EntityType = EntityType.Worker,
                    EntityId = wid.Value,
                    ProjectId = pid.Value,
                    PeriodStart = start.Value.Date,
                    PeriodEnd = end.Value.Date,
                    Notes = $"Payroll {start:yyyy-MM} for worker #{wid}" + (string.IsNullOrWhiteSpace(noteRef) ? string.Empty : " - " + noteRef),
                    DueDate = end.Value.Date.AddDays(DefaultDueDays),
                    Status = ObligationStatus.Pending,
                    IsLocked = false
                };

                foreach (var a in attendances)
                {
                    var hours = PayrollCalculator.ResolveHours(a);
                    if (hours <= 0m) continue;
                    var amount = decimal.Round(hours * hourlyRate, 2);
                    header.Lines.Add(new ObligationLine
                    {
                        Description = $"{a.Date:yyyy-MM-dd} � {hours}h @ {hourlyRate:N2}",
                        Quantity = 1m,
                        UnitRate = amount,
                        Amount = amount
                    });
                }

                header.TotalAmountSnapshot = header.Lines.Sum(l => l.Amount);
                header.Status = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, header.TotalAmountSnapshot, 0m);
                header.IsLocked = header.Status == ObligationStatus.Paid;

                _db.ObligationHeaders.Add(header);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                MessageBox.Show("Payroll obligation created.", "Payments", MessageBoxButton.OK, MessageBoxImage.Information);
                AttendanceGrid.ItemsSource = null;
                TotalAmountText.Text = string.Empty;
            }
            catch (DbUpdateException ex)
            {
                MessageBox.Show($"Create payroll failed: {ex.GetBaseException().Message}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to create payroll: {ex.Message}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
