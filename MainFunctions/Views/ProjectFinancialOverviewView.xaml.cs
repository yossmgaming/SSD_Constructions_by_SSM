using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    public partial class ProjectFinancialOverviewView : UserControl
    {
        private AppDbContext? _db;

        public ProjectFinancialOverviewView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            RefreshButton.Click += async (_, __) => await Refresh();
            AddSettlementButton.Click += OnAddSettlement;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            ProjectCombo.ItemsSource = projects;
            ProjectCombo.DisplayMemberPath = "Name";
            ProjectCombo.SelectedValuePath = "Id";
            ProjectCombo.SelectionChanged += async (_, __) => await Refresh();
        }

        private async Task Refresh()
        {
            var pid = ProjectCombo.SelectedValue as int?;
            if (!pid.HasValue)
            {
                ObligationsGrid.ItemsSource = null;
                TotalReceivableText.Text = TotalReceivedText.Text = OutstandingReceivableText.Text = TotalPayableText.Text = TotalPaidText.Text = OutstandingPayableText.Text = string.Empty;
                return;
            }

            var projected = (await FinancialProjections.LoadObligations(_db, null, null, null, null, null, 10000))
                .Where(o => o.ProjectId == pid.Value)
                .ToList();
            ObligationsGrid.ItemsSource = projected;

            var receivable = projected.Where(x => x.Direction == ObligationDirection.Receivable).Sum(x => x.TotalLines);
            var received = projected.Where(x => x.Direction == ObligationDirection.Receivable).Sum(x => x.TotalApplied);
            var outstandingRec = receivable - received;
            var payable = projected.Where(x => x.Direction == ObligationDirection.Payable).Sum(x => x.TotalLines);
            var paid = projected.Where(x => x.Direction == ObligationDirection.Payable).Sum(x => x.TotalApplied);
            var outstandingPay = payable - paid;

            TotalReceivableText.Text = receivable.ToString("N2", CultureInfo.CurrentCulture);
            TotalReceivedText.Text = received.ToString("N2", CultureInfo.CurrentCulture);
            OutstandingReceivableText.Text = outstandingRec.ToString("N2", CultureInfo.CurrentCulture);
            TotalPayableText.Text = payable.ToString("N2", CultureInfo.CurrentCulture);
            TotalPaidText.Text = paid.ToString("N2", CultureInfo.CurrentCulture);
            OutstandingPayableText.Text = outstandingPay.ToString("N2", CultureInfo.CurrentCulture);
        }

        private async void OnAddSettlement(object sender, RoutedEventArgs e)
        {
            try
            {
                var selected = ObligationsGrid.SelectedItem;
                if (selected == null)
                {
                    MessageBox.Show("Select an obligation.");
                    return;
                }
                var id = (int)selected.GetType().GetProperty("Id")!.GetValue(selected)!;
                var header = await _db.ObligationHeaders.Include(h => h.Lines).AsNoTracking().FirstAsync(h => h.Id == id);

                var date = SettlementDatePicker.SelectedDate ?? DateTime.Today;
                if (!decimal.TryParse(SettlementAmountBox.Text, System.Globalization.NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0m)
                {
                    MessageBox.Show("Enter a valid amount.");
                    return;
                }
                var method = (SettlementMethodCombo.SelectedItem as ComboBoxItem)?.Content as string ?? "Cash";
                var notes = SettlementNotesBox.Text?.Trim();
                var payer = SettlementPayerBox.Text?.Trim();

                var applied = (await _db.CashSettlements.AsNoTracking().Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal).Select(s => s.Amount).ToListAsync()).Sum()
                            + (await _db.AdvanceApplications.AsNoTracking().Where(a => a.ObligationHeaderId == header.Id).Select(a => a.AppliedAmount).ToListAsync()).Sum();
                var balance = header.Lines.Sum(l => l.Amount) - applied;

                await using var tx = await _db.Database.BeginTransactionAsync();

                var toApply = amount <= balance ? amount : balance;
                if (toApply > 0m)
                {
                    _db.CashSettlements.Add(new CashSettlement
                    {
                        ObligationHeaderId = header.Id,
                        Date = date.Date,
                        Amount = toApply,
                        Direction = header.Direction == ObligationDirection.Receivable ? CashDirection.In : CashDirection.Out,
                        Method = method,
                        FromEntityType = header.Direction == ObligationDirection.Receivable ? EntityType.Client : EntityType.None,
                        ToEntityType = header.Direction == ObligationDirection.Receivable ? EntityType.None : header.EntityType,
                        Notes = string.IsNullOrWhiteSpace(payer) ? notes : $"{payer} - {notes}"
                    });
                }

                var remainder = amount - toApply;
                if (remainder > 0m)
                {
                    _db.CashSettlements.Add(new CashSettlement
                    {
                        ObligationHeaderId = null,
                        Date = date.Date,
                        Amount = remainder,
                        Direction = header.Direction == ObligationDirection.Receivable ? CashDirection.In : CashDirection.Out,
                        Method = method,
                        FromEntityType = header.Direction == ObligationDirection.Receivable ? EntityType.Client : EntityType.None,
                        ToEntityType = header.Direction == ObligationDirection.Receivable ? EntityType.None : header.EntityType,
                        Notes = string.IsNullOrWhiteSpace(payer) ? notes : $"{payer} - {notes}"
                    });
                }

                await _db.SaveChangesAsync();

                var newApplied = (await _db.CashSettlements.AsNoTracking().Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal).Select(s => s.Amount).ToListAsync()).Sum()
                               + (await _db.AdvanceApplications.AsNoTracking().Where(a => a.ObligationHeaderId == header.Id).Select(a => a.AppliedAmount).ToListAsync()).Sum();
                var total = header.Lines.Sum(l => l.Amount);
                var newStatus = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, total, newApplied);
                var tracked = _db.ObligationHeaders.First(h => h.Id == header.Id);
                tracked.Status = newStatus;
                tracked.IsLocked = newStatus == ObligationStatus.Paid;
                tracked.TotalAmountSnapshot = total;
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                await Refresh();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to add settlement: {ex.Message}");
            }
        }
    }
}
