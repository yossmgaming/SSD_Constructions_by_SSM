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
using System.Text;

namespace MainFunctions.Views
{
    public partial class PaymentsView : UserControl
    {
        private AppDbContext? _db;
        private ObligationHeader? _selectedHeader;
        private const int PageSize = 500;

        // Helper to unwrap inner exceptions for clearer error messages
        private static string GetDeepMessage(Exception ex)
        {
            var sb = new StringBuilder();
            var cur = ex;
            while (cur != null)
            {
                if (sb.Length > 0) sb.Append(" → ");
                sb.Append(cur.Message);
                cur = cur.InnerException;
            }
            return sb.ToString();
        }

        public PaymentsView()
        {
            InitializeComponent();
            Loaded += PaymentsView_Loaded;
            HeadersGrid.SelectionChanged += HeadersGrid_SelectionChanged;
            MonthPicker.SelectedDateChanged += MonthPicker_SelectedDateChanged;
            TypeFilter.SelectionChanged += Filters_Changed;
            StatusFilter.SelectionChanged += Filters_Changed;
            FromDateFilter.SelectedDateChanged += Filters_Changed;
            ToDateFilter.SelectedDateChanged += Filters_Changed;
            SearchBox.TextChanged += Filters_Changed;

            PaymentType.SelectionChanged += PaymentType_SelectionChanged;
            PaymentProjectCombo.SelectionChanged += PaymentProjectCombo_SelectionChanged;
            CreateHeaderButton.Click += CreateHeaderButton_Click;
            ReverseSettlementButton.Click += ReverseSettlementButton_Click;

            AdvancedModeToggle.Checked += AdvancedModeToggle_Changed;
            AdvancedModeToggle.Unchecked += AdvancedModeToggle_Changed;
            // Disable manual creation controls by default
            AdvancedModeToggle.IsChecked = false;
            AdvancedBanner.Visibility = Visibility.Collapsed;
            SetManualControlsEnabled(false);
        }

        private void SetManualControlsEnabled(bool enabled)
        {
            CreateHeaderButton.IsEnabled = enabled;
            PaymentType.IsEnabled = enabled;
            PaymentProjectCombo.IsEnabled = enabled;
            PaymentEntityCombo.IsEnabled = enabled;
            PeriodStartPicker.IsEnabled = enabled;
            PeriodEndPicker.IsEnabled = enabled;
            PaymentNotes.IsEnabled = enabled;
            PaymentDueDate.IsEnabled = enabled;
            CreateHeaderAmount.IsEnabled = enabled;
        }

        private void AdvancedModeToggle_Changed(object sender, RoutedEventArgs e)
        {
            var enabled = AdvancedModeToggle.IsChecked == true;
            AdvancedBanner.Visibility = enabled ? Visibility.Visible : Visibility.Collapsed;
            SetManualControlsEnabled(enabled);
        }

        private async void PaymentsView_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureWorkerSchema(_db); } catch { }
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }

            await LoadProjectsIntoSelector();

            // Populate project picker for header creation
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            PaymentProjectCombo.ItemsSource = projects;
            PaymentProjectCombo.DisplayMemberPath = "Name";
            PaymentProjectCombo.SelectedValuePath = "Id";

            // Default payment type to first item to load entities
            if (PaymentType.SelectedIndex < 0) PaymentType.SelectedIndex = 0;
            await LoadEntitiesForPaymentType();

            MonthPicker.SelectedDate = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            await LoadHeaders();

            if (TypeFilter.Items.Count == 0)
            {
                TypeFilter.Items.Add(new ComboBoxItem { Content = "All" });
                TypeFilter.Items.Add(new ComboBoxItem { Content = "WorkerPayroll" });
                TypeFilter.Items.Add(new ComboBoxItem { Content = "MaterialPurchase" });
                TypeFilter.Items.Add(new ComboBoxItem { Content = "ProjectExpense" });
                TypeFilter.Items.Add(new ComboBoxItem { Content = "ClientInvoice" });
                TypeFilter.SelectedIndex = 0;
            }
            if (StatusFilter.Items.Count == 0)
            {
                StatusFilter.Items.Add(new ComboBoxItem { Content = "All" });
                StatusFilter.Items.Add(new ComboBoxItem { Content = "Pending" });
                StatusFilter.Items.Add(new ComboBoxItem { Content = "Partial" });
                StatusFilter.Items.Add(new ComboBoxItem { Content = "Paid" });
                StatusFilter.Items.Add(new ComboBoxItem { Content = "Overdue" });
                StatusFilter.SelectedIndex = 0;
            }

            PaymentEntityCombo.IsEnabled = true;
            PaymentProjectCombo.IsEnabled = true;
        }

        private async Task LoadProjectsIntoSelector()
        {
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            ProjectSelector.ItemsSource = projects;
            ProjectSelector.DisplayMemberPath = "Name";
            ProjectSelector.SelectedValuePath = "Id";
        }

        private async Task LoadEntitiesForPaymentType()
        {
            var type = (PaymentType.SelectedItem as ComboBoxItem)?.Content as string;
            if (string.IsNullOrEmpty(type))
            {
                PaymentEntityCombo.ItemsSource = null;
                return;
            }

            // Keep grid filter in sync with selected type to "switch" the grid
            var idx = FindIndexByContent(TypeFilter, type);
            if (idx >= 0) TypeFilter.SelectedIndex = idx; else TypeFilter.SelectedIndex = 0;

            PaymentEntityCombo.IsEnabled = true;

            switch (type)
            {
                case "WorkerPayroll":
                {
                    var workers = await _db.Workers.AsNoTracking().OrderBy(w => w.FullName).Select(w => new { w.Id, w.FullName }).ToListAsync();
                    PaymentEntityCombo.ItemsSource = workers;
                    PaymentEntityCombo.DisplayMemberPath = "FullName";
                    PaymentEntityCombo.SelectedValuePath = "Id";
                    break;
                }
                case "MaterialPurchase":
                {
                    var materials = await _db.Materials.AsNoTracking().OrderBy(m => m.Name).Select(m => new { m.Id, m.Name }).ToListAsync();
                    PaymentEntityCombo.ItemsSource = materials;
                    PaymentEntityCombo.DisplayMemberPath = "Name";
                    PaymentEntityCombo.SelectedValuePath = "Id";
                    break;
                }
                case "ProjectExpense":
                {
                    var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
                    PaymentEntityCombo.ItemsSource = projects;
                    PaymentEntityCombo.DisplayMemberPath = "Name";
                    PaymentEntityCombo.SelectedValuePath = "Id";
                    break;
                }
                case "ClientInvoice":
                {
                    // For client invoices, the true entity is the project/client combo. Drive via project selection.
                    PaymentEntityCombo.ItemsSource = null;
                    PaymentEntityCombo.IsEnabled = false;
                    await UpdateClientFromProject();
                    break;
                }
                default:
                    PaymentEntityCombo.ItemsSource = null;
                    break;
            }
        }

        private static int FindIndexByContent(ComboBox combo, string content)
        {
            for (int i = 0; i < combo.Items.Count; i++)
            {
                if ((combo.Items[i] as ComboBoxItem)?.Content as string == content) return i;
            }
            return -1;
        }

        private async void PaymentType_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Clear any selected header (we're composing a new header)
            HeadersGrid.SelectedItem = null;
            _selectedHeader = null;
            PaymentEntityCombo.IsEnabled = true;
            PaymentProjectCombo.IsEnabled = true;
            await LoadEntitiesForPaymentType();
            await LoadHeaders();
        }

        private async void PaymentProjectCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (((PaymentType.SelectedItem as ComboBoxItem)?.Content as string) == "ClientInvoice")
            {
                await UpdateClientFromProject();
            }
        }

        private async Task UpdateClientFromProject()
        {
            var pid = PaymentProjectCombo.SelectedValue as int?;
            if (!pid.HasValue)
            {
                PaymentEntityCombo.ItemsSource = null;
                return;
            }
            var proj = await _db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pid.Value);
            var name = proj?.Client ?? string.Empty;
            PaymentEntityCombo.ItemsSource = new[] { name };
        }

        private async void Filters_Changed(object? sender, EventArgs e)
        {
            await LoadHeaders();
        }

        private async Task LoadHeaders()
        {
            try
            {
                var from = FromDateFilter.SelectedDate;
                var to = ToDateFilter.SelectedDate;
                var statusFilter = (StatusFilter.SelectedItem as ComboBoxItem)?.Content as string;
                var typeFilter = (TypeFilter.SelectedItem as ComboBoxItem)?.Content as string;
                var search = SearchBox.Text?.Trim();

                var projected = await FinancialProjections.LoadObligations(_db, from, to, typeFilter, statusFilter, search, PageSize);

                HeadersGrid.ItemsSource = projected;

                var receivable = projected.Where(x => x.Direction == ObligationDirection.Receivable).Sum(x => x.Balance);
                var payable = projected.Where(x => x.Direction == ObligationDirection.Payable).Sum(x => x.Balance);
                var overdue = projected.Where(x => x.IsOverdue).Sum(x => x.Balance);
                var net = receivable - payable;

                TotalReceivableText.Text = string.Format(CultureInfo.CurrentCulture, "LKR {0:N2}", receivable);
                TotalPayableText.Text = string.Format(CultureInfo.CurrentCulture, "LKR {0:N2}", payable);
                OverdueAmountText.Text = string.Format(CultureInfo.CurrentCulture, "LKR {0:N2}", overdue);
                NetPositionText.Text = string.Format(CultureInfo.CurrentCulture, "LKR {0:N2}", net);

                OverdueGrid.ItemsSource = projected.Where(x => x.IsOverdue && x.Balance > 0m).ToList();
                ReceivablesGrid.ItemsSource = projected.Where(x => x.Direction == ObligationDirection.Receivable && x.Balance > 0m).ToList();
                PayablesGrid.ItemsSource = projected.Where(x => x.Direction == ObligationDirection.Payable && x.Balance > 0m).ToList();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load obligations: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void HeadersGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var selected = HeadersGrid.SelectedItem;
            if (selected == null)
            {
                _selectedHeader = null;
                ClearDetailPanel();
                HeaderSettlementsGrid.ItemsSource = null;
                return;
            }

            // Defensive: ensure selected object has an Id property and a valid int value
            var idProp = selected.GetType().GetProperty("Id");
            if (idProp == null)
            {
                MessageBox.Show("Selected item does not contain an 'Id' property.", "Payments", MessageBoxButton.OK, MessageBoxImage.Warning);
                _selectedHeader = null;
                ClearDetailPanel();
                HeaderSettlementsGrid.ItemsSource = null;
                return;
            }

            var idVal = idProp.GetValue(selected);
            if (idVal == null || !int.TryParse(idVal.ToString(), out var id))
            {
                MessageBox.Show("Unable to determine selected obligation Id.", "Payments", MessageBoxButton.OK, MessageBoxImage.Warning);
                _selectedHeader = null;
                ClearDetailPanel();
                HeaderSettlementsGrid.ItemsSource = null;
                return;
            }

            _selectedHeader = await _db.ObligationHeaders
                .Include(h => h.Lines)
                .Include(h => h.Settlements)
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.Id == id);

            if (_selectedHeader == null) return;

            // Set type combo selection to header type
            var typeIdx = FindIndexByContent(PaymentType, _selectedHeader.Type);
            if (typeIdx >= 0) PaymentType.SelectedIndex = typeIdx;

            // Load entity list for that type, then select the entity value; disable editing
            await LoadEntitiesForPaymentType();
            PaymentProjectCombo.SelectedValue = _selectedHeader.ProjectId;
            if (_selectedHeader.Type == "ClientInvoice")
            {
                await UpdateClientFromProject();
            }
            else
            {
                PaymentEntityCombo.SelectedValue = _selectedHeader.EntityId;
            }
            PaymentEntityCombo.IsEnabled = false;
            PaymentProjectCombo.IsEnabled = false;

            PeriodStartPicker.SelectedDate = _selectedHeader.PeriodStart;
            PeriodEndPicker.SelectedDate = _selectedHeader.PeriodEnd;

            var total = _selectedHeader.Lines.Sum(l => l.Amount);
            var applied = (await _db.CashSettlements.AsNoTracking()
                            .Where(s => s.ObligationHeaderId == _selectedHeader.Id && !s.IsReversal)
                            .Select(s => s.Amount)
                            .ToListAsync()).Sum()
                        + (await _db.AdvanceApplications.AsNoTracking()
                            .Where(a => a.ObligationHeaderId == _selectedHeader.Id)
                            .Select(a => a.AppliedAmount)
                            .ToListAsync()).Sum();
            var balance = total - applied;
            PaymentTotal.Text = total.ToString("N2", CultureInfo.InvariantCulture);
            PaymentPaid.Text = applied.ToString("N2", CultureInfo.InvariantCulture);
            PaymentBalance.Text = balance.ToString("N2", CultureInfo.InvariantCulture);

            var st = ObligationHeader.ComputeStatus(DateTime.Today, _selectedHeader.DueDate, total, applied).ToString();
            PaymentStatus.SelectedIndex = -1;
            for (int i = 0; i < PaymentStatus.Items.Count; i++)
            {
                var c = PaymentStatus.Items[i] as ComboBoxItem;
                if ((c?.Content as string) == st) { PaymentStatus.SelectedIndex = i; break; }
            }
            PaymentDueDate.SelectedDate = _selectedHeader.DueDate;

            var isLocked = st == nameof(ObligationStatus.Paid);
            AddSettlementButton.IsEnabled = !isLocked;
            SettlementDate.IsEnabled = !isLocked;
            SettlementAmount.IsEnabled = !isLocked;
            SettlementMethod.IsEnabled = !isLocked;

            // Load settlements for header
            var settlements = await _db.CashSettlements.AsNoTracking()
                .Where(s => s.ObligationHeaderId == _selectedHeader.Id)
                .OrderBy(s => s.Date)
                .ToListAsync();
            HeaderSettlementsGrid.ItemsSource = settlements;
        }

        private void ClearDetailPanel()
        {
            PaymentTotal.Text = string.Empty;
            PaymentPaid.Text = string.Empty;
            PaymentBalance.Text = string.Empty;
            PaymentStatus.SelectedIndex = -1;
            PaymentDueDate.SelectedDate = null;
            SettlementDate.SelectedDate = null;
            SettlementAmount.Text = string.Empty;
            SettlementMethod.SelectedIndex = -1;

            // Reset creation controls
            if (PaymentType.SelectedIndex < 0) PaymentType.SelectedIndex = 0;
            LoadEntitiesForPaymentType();
            PaymentEntityCombo.IsEnabled = true;
            PaymentProjectCombo.IsEnabled = true;
            PeriodStartPicker.SelectedDate = null;
            PeriodEndPicker.SelectedDate = null;
            PaymentNotes.Text = string.Empty;

            HeaderSettlementsGrid.ItemsSource = null;
        }

        private async void Refresh_Click(object sender, RoutedEventArgs e)
        {
            await LoadHeaders();
        }

        private async void GeneratePayrollButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (ProjectSelector.SelectedValue == null || MonthPicker.SelectedDate == null)
                {
                    MessageBox.Show("Select project and month.");
                    return;
                }
                var projectId = (int)ProjectSelector.SelectedValue;
                var anyDateInMonth = MonthPicker.SelectedDate!.Value.Date;
                var periodStart = new DateTime(anyDateInMonth.Year, anyDateInMonth.Month, 1);
                var periodEnd = periodStart.AddMonths(1).AddDays(-1);

                var assignedWorkers = await _db.ProjectWorkers.AsNoTracking()
                    .Where(pw => pw.ProjectId == projectId && (pw.AssignedFrom == null || pw.AssignedFrom <= periodEnd) && (pw.AssignedTo == null || pw.AssignedTo >= periodStart))
                    .Select(pw => pw.WorkerId)
                    .Distinct()
                    .ToListAsync();

                foreach (var workerId in assignedWorkers)
                {
                    var exists = await _db.ObligationHeaders.AsNoTracking().AnyAsync(h => h.Type == "WorkerPayroll" && h.EntityId == workerId && h.ProjectId == projectId && h.PeriodStart == periodStart && h.PeriodEnd == periodEnd);
                    if (exists) continue;

                    var worker = await _db.Workers.AsNoTracking().FirstAsync(w => w.Id == workerId);
                    var hourlyRate = PayrollCalculator.GetHourlyRate(worker.DailyRate);

                    var attendances = await _db.Attendances.AsNoTracking()
                        .Where(a => a.WorkerId == workerId && a.ProjectId == projectId && a.Date.Date >= periodStart && a.Date.Date <= periodEnd)
                        .OrderBy(a => a.Date)
                        .ToListAsync();

                    var header = new ObligationHeader
                    {
                        Type = "WorkerPayroll",
                        Direction = ObligationDirection.Payable,
                        EntityType = EntityType.Worker,
                        EntityId = workerId,
                        ProjectId = projectId,
                        PeriodStart = periodStart,
                        PeriodEnd = periodEnd,
                        Notes = $"Payroll {periodStart:yyyy-MM} for {worker.FullName}",
                        DueDate = periodEnd.AddDays(7),
                        Status = ObligationStatus.Pending,
                        IsLocked = false
                    };

                    foreach (var a in attendances)
                    {
                        var h = PayrollCalculator.ResolveHours(a);
                        if (h <= 0m) continue;
                        var amount = decimal.Round(h * hourlyRate, 2);
                        header.Lines.Add(new ObligationLine
                        {
                            Description = $"{a.Date:yyyy-MM-dd} · {h}h @ {hourlyRate:N2}",
                            Quantity = 1m,
                            UnitRate = amount,
                            Amount = amount
                        });
                    }

                    header.TotalAmountSnapshot = header.Lines.Sum(l => l.Amount);
                    header.Status = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, header.TotalAmountSnapshot, 0m);
                    header.IsLocked = header.Status == ObligationStatus.Paid;
                    _db.ObligationHeaders.Add(header);
                }

                await _db.SaveChangesAsync();
                await LoadHeaders();
                MessageBox.Show("Payroll generated.", "Payments", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to generate payroll: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void CreateHeaderButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var type = (PaymentType.SelectedItem as ComboBoxItem)?.Content as string;
                if (string.IsNullOrEmpty(type)) { MessageBox.Show("Select a payment type."); return; }

                int? projectId = PaymentProjectCombo.SelectedValue as int?;
                int? entityId = PaymentEntityCombo.SelectedValue as int?;

                if (type == "ClientInvoice")
                {
                    if (!projectId.HasValue)
                    {
                        MessageBox.Show("Select a project for the client invoice.");
                        return;
                    }
                }
                else if (type != "ProjectExpense" && !entityId.HasValue)
                {
                    MessageBox.Show("Select an entity.");
                    return;
                }

                var notes = PaymentNotes.Text?.Trim();
                var due = PaymentDueDate.SelectedDate;
                if (type == "ClientInvoice" && !due.HasValue)
                {
                    MessageBox.Show("Due date is required for ClientInvoice.");
                    return;
                }

                var periodStart = PeriodStartPicker.SelectedDate ?? DateTime.Today;
                var periodEnd = PeriodEndPicker.SelectedDate ?? DateTime.Today;

                var amountText = CreateHeaderAmount.Text?.Trim();
                if (!decimal.TryParse(amountText, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0m)
                {
                    MessageBox.Show("Enter a valid amount.");
                    return;
                }

                // Uniqueness validation mirrors DB logic: ClientInvoice per project + period; others include entity when present
                bool exists;
                if (type == "ClientInvoice")
                {
                    exists = await _db.ObligationHeaders.AsNoTracking()
                        .AnyAsync(h => h.Type == type && h.ProjectId == projectId && h.PeriodStart == periodStart.Date && h.PeriodEnd == periodEnd.Date);
                }
                else
                {
                    exists = await _db.ObligationHeaders.AsNoTracking()
                        .AnyAsync(h => h.Type == type && h.EntityId == (entityId ?? null) && h.ProjectId == projectId && h.PeriodStart == periodStart.Date && h.PeriodEnd == periodEnd.Date);
                }
                if (exists)
                {
                    MessageBox.Show("An obligation already exists for this scope and period.", "Payments", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                var direction = type == "ClientInvoice" ? ObligationDirection.Receivable : ObligationDirection.Payable;
                var entityType = type == "WorkerPayroll" ? EntityType.Worker
                                : type == "MaterialPurchase" ? EntityType.Supplier
                                : type == "ProjectExpense" ? EntityType.None
                                : EntityType.Client;

                var header = new ObligationHeader
                {
                    Type = type,
                    Direction = direction,
                    EntityType = entityType,
                    EntityId = type == "ClientInvoice" ? null : entityId,
                    ProjectId = projectId,
                    PeriodStart = periodStart.Date,
                    PeriodEnd = periodEnd.Date,
                    Notes = string.IsNullOrWhiteSpace(notes) ? "Manual entry" : notes!,
                    DueDate = due,
                    Status = ObligationStatus.Pending,
                    IsLocked = false
                };

                header.Lines.Add(new ObligationLine
                {
                    Description = string.IsNullOrWhiteSpace(notes) ? "Manual entry" : notes!,
                    Quantity = 1m,
                    UnitRate = amount,
                    Amount = amount
                });

                header.TotalAmountSnapshot = amount;
                header.Status = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, header.TotalAmountSnapshot, 0m);
                header.IsLocked = header.Status == ObligationStatus.Paid;

                _db.ObligationHeaders.Add(header);
                await _db.SaveChangesAsync();

                PaymentEntityCombo.IsEnabled = false;
                PaymentProjectCombo.IsEnabled = false;

                await LoadHeaders();
                MessageBox.Show("Obligation created.", "Payments", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (DbUpdateException ex)
            {
                MessageBox.Show($"Create obligation failed: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to create obligation: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MonthPicker_SelectedDateChanged(object? sender, SelectionChangedEventArgs e)
        {
            if (MonthPicker.SelectedDate.HasValue)
            {
                var d = MonthPicker.SelectedDate.Value;
                MonthPicker.SelectedDate = new DateTime(d.Year, d.Month, 1);
            }
        }

        private async void AddSettlementButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_selectedHeader == null)
                {
                    MessageBox.Show("Select a header.");
                    return;
                }

                var total = _selectedHeader.Lines.Sum(l => l.Amount);
                var applied = (await _db.CashSettlements.AsNoTracking()
                                .Where(s => s.ObligationHeaderId == _selectedHeader.Id && !s.IsReversal)
                                .Select(s => s.Amount)
                                .ToListAsync()).Sum()
                            + (await _db.AdvanceApplications.AsNoTracking()
                                .Where(a => a.ObligationHeaderId == _selectedHeader.Id)
                                .Select(a => a.AppliedAmount)
                                .ToListAsync()).Sum();
                var balance = total - applied;

                if (_selectedHeader.Status == ObligationStatus.Paid || balance <= 0m)
                {
                    MessageBox.Show("Header is locked.");
                    return;
                }

                var date = SettlementDate.SelectedDate ?? DateTime.Today;
                if (!decimal.TryParse(SettlementAmount.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0m)
                {
                    MessageBox.Show("Enter a valid amount.");
                    return;
                }
                var method = (SettlementMethod.SelectedItem as ComboBoxItem)?.Content as string ?? "Cash";

                await using var tx = await _db.Database.BeginTransactionAsync();

                var toApply = amount <= balance ? amount : balance;
                if (toApply > 0m)
                {
                    var settlement = new CashSettlement
                    {
                        ObligationHeaderId = _selectedHeader.Id,
                        Date = date.Date,
                        Amount = toApply,
                        Direction = _selectedHeader.Direction == ObligationDirection.Receivable ? CashDirection.In : CashDirection.Out,
                        Method = method,
                        FromEntityType = _selectedHeader.Direction == ObligationDirection.Receivable ? EntityType.Client : EntityType.None,
                        ToEntityType = _selectedHeader.Direction == ObligationDirection.Receivable ? EntityType.None : _selectedHeader.EntityType,
                        Notes = $"Applied to obligation #{_selectedHeader.Id}"
                    };
                    _db.CashSettlements.Add(settlement);
                }

                var remainder = amount - toApply;
                if (remainder > 0m)
                {
                    var advance = new CashSettlement
                    {
                        ObligationHeaderId = null,
                        Date = date.Date,
                        Amount = remainder,
                        Direction = _selectedHeader.Direction == ObligationDirection.Receivable ? CashDirection.In : CashDirection.Out,
                        Method = method,
                        FromEntityType = _selectedHeader.Direction == ObligationDirection.Receivable ? EntityType.Client : EntityType.None,
                        ToEntityType = _selectedHeader.Direction == ObligationDirection.Receivable ? EntityType.None : _selectedHeader.EntityType,
                        Notes = $"Advance for project {_selectedHeader.ProjectId}"
                    };
                    _db.CashSettlements.Add(advance);
                }

                await _db.SaveChangesAsync();

                // Recompute header status
                var newApplied = (await _db.CashSettlements.AsNoTracking()
                                   .Where(s => s.ObligationHeaderId == _selectedHeader.Id && !s.IsReversal)
                                   .Select(s => s.Amount)
                                   .ToListAsync()).Sum()
                               + (await _db.AdvanceApplications.AsNoTracking()
                                   .Where(a => a.ObligationHeaderId == _selectedHeader.Id)
                                   .Select(a => a.AppliedAmount)
                                   .ToListAsync()).Sum();
                var newStatus = ObligationHeader.ComputeStatus(DateTime.Today, _selectedHeader.DueDate, total, newApplied);
                var tracked = await _db.ObligationHeaders.FirstAsync(h => h.Id == _selectedHeader.Id);
                tracked.Status = newStatus;
                tracked.IsLocked = newStatus == ObligationStatus.Paid;
                tracked.TotalAmountSnapshot = total;
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                await LoadHeaders();
                HeadersGrid.SelectedItem = null;
                ClearDetailPanel();
            }
            catch (DbUpdateException ex)
            {
                MessageBox.Show($"Add settlement failed: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to add settlement: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void ReverseSettlementButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_selectedHeader == null)
                {
                    MessageBox.Show("Select a header.");
                    return;
                }
                var selected = HeaderSettlementsGrid.SelectedItem as CashSettlement;
                if (selected == null)
                {
                    MessageBox.Show("Select a settlement to reverse.");
                    return;
                }
                if (selected.IsReversal)
                {
                    MessageBox.Show("Selected row is already a reversal.");
                    return;
                }
                // Guard against double reversal
                var alreadyReversed = await _db.CashSettlements.AsNoTracking().AnyAsync(s => s.ReversesSettlementId == selected.Id);
                if (alreadyReversed)
                {
                    MessageBox.Show("Settlement already reversed.");
                    return;
                }

                await using var tx = await _db.Database.BeginTransactionAsync();

                var reversal = new CashSettlement
                {
                    ObligationHeaderId = selected.ObligationHeaderId,
                    Date = DateTime.Today,
                    Amount = selected.Amount,
                    Direction = selected.Direction == CashDirection.In ? CashDirection.Out : CashDirection.In,
                    Method = selected.Method,
                    FromEntityType = selected.FromEntityType,
                    FromEntityId = selected.FromEntityId,
                    ToEntityType = selected.ToEntityType,
                    ToEntityId = selected.ToEntityId,
                    Notes = $"Reversal of settlement #{selected.Id}",
                    IsReversal = true,
                    ReversesSettlementId = selected.Id
                };
                _db.CashSettlements.Add(reversal);
                await _db.SaveChangesAsync();

                // Recompute header status
                var total = _selectedHeader.Lines.Sum(l => l.Amount);
                var applied = (await _db.CashSettlements.AsNoTracking()
                                .Where(s => s.ObligationHeaderId == _selectedHeader.Id && !s.IsReversal)
                                .Select(s => s.Amount)
                                .ToListAsync()).Sum()
                            + (await _db.AdvanceApplications.AsNoTracking()
                                .Where(a => a.ObligationHeaderId == _selectedHeader.Id)
                                .Select(a => a.AppliedAmount)
                                .ToListAsync()).Sum();
                var newStatus = ObligationHeader.ComputeStatus(DateTime.Today, _selectedHeader.DueDate, total, applied);
                var tracked = await _db.ObligationHeaders.FirstAsync(h => h.Id == _selectedHeader.Id);
                tracked.Status = newStatus;
                tracked.IsLocked = newStatus == ObligationStatus.Paid;
                tracked.TotalAmountSnapshot = total;
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                // Refresh detail grid and headers
                // HeadersGrid_SelectionChanged(null!, null!); // No longer needed, LoadHeaders() refreshes
                await LoadHeaders();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to reverse settlement: {GetDeepMessage(ex)}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ExportPaymentsButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var items = HeadersGrid.ItemsSource as IEnumerable<FinancialProjections.ObligationProjection>;
                if (items == null)
                {
                    MessageBox.Show("Nothing to export.");
                    return;
                }

                var list = items.ToList();
                var generatedAt = DateTime.Now.ToString("s", CultureInfo.InvariantCulture);

                var sb = new StringBuilder();
                sb.AppendLine("Id,Type,Project,Entity,Period,Total,Applied,Balance,Status,DueDate,IsOverdue,GeneratedAt");

                foreach (var it in list)
                {
                    var id = it.Id;
                    var type = it.Type;
                    var project = it.ProjectName;
                    var entity = it.EntityName;
                    var period = it.Period;
                    var total = it.TotalLines;
                    var applied = it.TotalApplied;
                    var balance = it.Balance;
                    var status = it.Status;
                    var due = it.DueDate.HasValue ? it.DueDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;

                    sb.AppendLine(string.Join(",",
                        id.ToString(CultureInfo.InvariantCulture),
                        Escape(type), Escape(project), Escape(entity), Escape(period),
                        total.ToString("N2", CultureInfo.InvariantCulture),
                        applied.ToString("N2", CultureInfo.InvariantCulture),
                        balance.ToString("N2", CultureInfo.InvariantCulture),
                        Escape(status), Escape(due), it.IsOverdue ? "true" : "false", Escape(generatedAt)));
                }

                var path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), $"obligations_{DateTime.Now:yyyyMMddHHmmss}.csv");
                System.IO.File.WriteAllText(path, sb.ToString());
                MessageBox.Show($"Exported to {path}");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Export failed: {ex.Message}", "Payments", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private static string Escape(string? s)
        {
            s ??= string.Empty;
            if (s.Contains('\n') || s.Contains(',') || s.Contains('"'))
            {
                return '"' + s.Replace("\"", "\"\"") + '"';
            }
            return s;
        }
    }
}
