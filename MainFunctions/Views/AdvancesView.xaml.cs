using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using System.Collections.Generic;
using MainFunctions.Services;
using Microsoft.Extensions.Logging;

namespace MainFunctions.Views
{
    public partial class AdvancesView : UserControl
    {
        private AppDbContext? _db;
        private IAdvanceApplicationService? _advanceService;

        public AdvancesView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            RefreshButton.Click += async (_, __) => await LoadAdvances();
            ApplyAdvanceButton.Click += OnApplyAdvance;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();

            // Create a simple logger for the advance service using the app file logger provider
            var loggerFactory = LoggerFactory.Create(builder =>
            {
                builder.AddProvider(new FileLoggerProvider("logs/app.log"));
                builder.SetMinimumLevel(LogLevel.Information);
            });

            _advanceService = new AdvanceApplicationService(new DbContextFactory(), loggerFactory.CreateLogger<AdvanceApplicationService>());

            await LoadAdvances();
        }

        private sealed class AdvanceRow
        {
            public int Id { get; set; }
            public DateTime Date { get; set; }
            public string FromEntityLabel { get; set; } = string.Empty;
            public CashDirection Direction { get; set; }
            public decimal OriginalAmount { get; set; }
            public decimal AppliedAmount { get; set; }
            public decimal Remaining => OriginalAmount - AppliedAmount;
            public string Notes { get; set; } = string.Empty;
        }

        private async Task LoadAdvances()
        {
            if (_db == null) return;
            // Server-side projection computes applied sum per advance and uses RemainingAmount if available
            var rows = await _db.CashSettlements.AsNoTracking()
                .Where(s => s.ObligationHeaderId == null && !s.IsReversal)
                .OrderByDescending(s => s.Date)
                .Select(s => new AdvanceRow
                {
                    Id = s.Id,
                    Date = s.Date,
                    FromEntityLabel = s.FromEntityType.ToString(),
                    Direction = s.Direction,
                    OriginalAmount = s.Amount,
                    // EF Core + Sqlite cannot SUM(decimal) server-side. Sum as double then cast back to decimal.
                    AppliedAmount = (decimal)(_db.AdvanceApplications
                        .Where(a => a.AdvanceSettlementId == s.Id)
                        .Select(a => (double?)a.AppliedAmount)
                        .Sum() ?? 0.0),
                    Notes = s.Notes
                })
                .ToListAsync();

            // Fix display value if RemainingAmount column is available and valid
            // Use a second query to read RemainingAmount only when present to avoid schema issues
            try
            {
                var remainingMap = (await _db.CashSettlements.AsNoTracking()
                    .Where(s => rows.Select(r => r.Id).Contains(s.Id))
                    .Select(s => new { s.Id, Remaining = EF.Property<decimal?>(s, "RemainingAmount") })
                    .ToListAsync()).ToDictionary(k => k.Id, v => v.Remaining);

                foreach (var r in rows)
                {
                    if (remainingMap.TryGetValue(r.Id, out var rem) && rem.HasValue)
                    {
                        r.AppliedAmount = r.OriginalAmount - rem.Value;
                    }
                }
            }
            catch { /* ignore if RemainingAmount doesn't exist */ }

            AdvancesGrid.ItemsSource = rows;
        }

        private async void OnApplyAdvance(object sender, RoutedEventArgs e)
        {
            var row = AdvancesGrid.SelectedItem as AdvanceRow;
            if (row == null)
            {
                MessageBox.Show("Select an advance to apply.");
                return;
            }

            if (_advanceService == null)
            {
                MessageBox.Show("Advance service not available.");
                return;
            }

            var dialog = new ApplyAdvanceDialog(_db!, _advanceService, row.Id, row.Remaining);
            dialog.Owner = Window.GetWindow(this);
            if (dialog.ShowDialog() == true)
            {
                await LoadAdvances();
            }
        }
    }
}
