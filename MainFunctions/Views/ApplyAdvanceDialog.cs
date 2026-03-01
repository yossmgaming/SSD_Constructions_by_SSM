using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    public class ApplyAdvanceDialog : Window
    {
        private readonly AppDbContext _db;
        private readonly IAdvanceApplicationService _advanceService;
        private readonly int _advanceId;
        private readonly decimal _remaining;
        private ComboBox _headerCombo = new ComboBox();
        private TextBox _amountBox = new TextBox();
        private Button _applyButton = new Button { Content = "Apply" };
        private Button _cancelButton = new Button { Content = "Cancel" };

        // UX guardrail threshold
        private const decimal LargeAmountThreshold = 100000m;

        public ApplyAdvanceDialog(AppDbContext db, IAdvanceApplicationService advanceService, int advanceId, decimal remaining)
        {
            _db = db;
            _advanceService = advanceService;
            _advanceId = advanceId;
            _remaining = remaining;

            Title = "Apply Advance";
            Width = 480;
            Height = 300;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;

            var grid = new Grid { Margin = new Thickness(12) };
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            var headerLabel = new TextBlock { Text = "Obligation Header", Margin = new Thickness(0,0,0,4) };
            Grid.SetRow(headerLabel, 0);
            grid.Children.Add(headerLabel);

            _headerCombo.IsEditable = true;
            _headerCombo.IsTextSearchEnabled = true;
            _headerCombo.MinWidth = 300;
            _headerCombo.SelectionChanged += HeaderCombo_SelectionChanged;
            Grid.SetRow(_headerCombo, 1);
            grid.Children.Add(_headerCombo);

            var amountLabel = new TextBlock { Text = "Amount (LKR)", Margin = new Thickness(0,8,0,4) };
            Grid.SetRow(amountLabel, 2);
            grid.Children.Add(amountLabel);

            _amountBox.Margin = new Thickness(0,0,0,8);
            _amountBox.MinWidth = 120;
            Grid.SetRow(_amountBox, 3);
            grid.Children.Add(_amountBox);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            _applyButton.FontSize = 14;
            _applyButton.Padding = new Thickness(12,6,12,6);
            _applyButton.Margin = new Thickness(0,0,8,0);
            buttons.Children.Add(_applyButton);
            buttons.Children.Add(_cancelButton);
            Grid.SetRow(buttons, 4);
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.Children.Add(buttons);

            Content = grid;

            Loaded += OnLoaded;
            _applyButton.Click += OnApplyClicked;
            _cancelButton.Click += (_, __) => DialogResult = false;
        }

        private void OnLoaded(object? sender, EventArgs e)
        {
            var headers = _db.ObligationHeaders.AsNoTracking()
                .OrderByDescending(h => h.PeriodEnd)
                .Select(h => new { h.Id, Label = $"#{h.Id} • {h.Type} • {h.PeriodStart:yyyy-MM-dd} to {h.PeriodEnd:yyyy-MM-dd}" })
                .ToList();
            _headerCombo.ItemsSource = headers;
            _headerCombo.DisplayMemberPath = "Label";
            _headerCombo.SelectedValuePath = "Id";
        }

        private async void HeaderCombo_SelectionChanged(object? sender, SelectionChangedEventArgs e)
        {
            // When header selection changes, compute header balance and prefill suggested amount
            var headerId = _headerCombo.SelectedValue as int?;
            if (!headerId.HasValue) return;

            try
            {
                var header = await _db.ObligationHeaders.Include(h => h.Lines).FirstOrDefaultAsync(h => h.Id == headerId.Value);
                if (header == null) return;

                var settlements = await _db.CashSettlements.AsNoTracking().Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal).Select(s => s.Amount).ToListAsync();
                var settlementsSum = settlements.Any() ? settlements.Sum() : 0m;

                var appliedToHeaderList = await _db.AdvanceApplications.AsNoTracking().Where(a => a.ObligationHeaderId == header.Id).Select(a => a.AppliedAmount).ToListAsync();
                var appliedToHeaderSum = appliedToHeaderList.Any() ? appliedToHeaderList.Sum() : 0m;

                var headerBalance = header.Lines.Sum(l => l.Amount) - (settlementsSum + appliedToHeaderSum);

                // Suggest amount as min of advance remaining and headerBalance
                var suggested = Math.Min(_remaining, headerBalance);
                if (suggested < 0m) suggested = 0m;
                _amountBox.Text = suggested.ToString(System.Globalization.CultureInfo.CurrentCulture);
            }
            catch
            {
                // ignore UI prefill errors
            }
        }

        private async void OnApplyClicked(object? sender, EventArgs e)
        {
            var headerId = _headerCombo.SelectedValue as int?;
            if (!headerId.HasValue)
            {
                MessageBox.Show("Select an obligation header.");
                return;
            }
            if (!decimal.TryParse(_amountBox.Text, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.CurrentCulture, out var amount) || amount <= 0m)
            {
                MessageBox.Show("Enter a valid amount.");
                return;
            }

            // Compute current remaining and header balance for preview
            decimal remainingValue = 0m;
            decimal headerBalance = 0m;
            try
            {
                var settlement = await _db.CashSettlements.AsNoTracking().FirstOrDefaultAsync(s => s.Id == _advanceId);
                var appliedListForAdvance = await _db.AdvanceApplications.AsNoTracking().Where(a => a.AdvanceSettlementId == _advanceId).Select(a => a.AppliedAmount).ToListAsync();
                var appliedSumForAdvance = appliedListForAdvance.Any() ? appliedListForAdvance.Sum() : 0m;
                remainingValue = settlement != null ? settlement.Amount - appliedSumForAdvance : 0m - appliedSumForAdvance;

                var header = await _db.ObligationHeaders.Include(h => h.Lines).FirstOrDefaultAsync(h => h.Id == headerId.Value);
                var settlementsAmounts = await _db.CashSettlements.AsNoTracking().Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal).Select(s => s.Amount).ToListAsync();
                var settlementsSum = settlementsAmounts.Any() ? settlementsAmounts.Sum() : 0m;
                var appliedAmountsToHeader = await _db.AdvanceApplications.AsNoTracking().Where(a => a.ObligationHeaderId == header.Id).Select(a => a.AppliedAmount).ToListAsync();
                var appliedToHeaderSum = appliedAmountsToHeader.Any() ? appliedAmountsToHeader.Sum() : 0m;
                headerBalance = header.Lines.Sum(l => l.Amount) - (settlementsSum + appliedToHeaderSum);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to compute preview: {ex.Message}");
                return;
            }

            // Build preview text
            var preview = $"Apply {amount:C} from Advance #{_advanceId} to Obligation #{headerId.Value}\n\n" +
                          $"Advance remaining before: {remainingValue:C}\n" +
                          $"Advance remaining after: {Math.Max(remainingValue - amount, 0m):C}\n\n" +
                          $"Obligation balance before: {headerBalance:C}\n" +
                          $"Obligation balance after: {Math.Max(headerBalance - amount, 0m):C}\n\n" +
                          "Do you want to commit this application?";

            if (amount >= LargeAmountThreshold)
            {
                preview = "WARNING: This is a large amount. Please verify carefully.\n\n" + preview;
            }

            var confirm = ShowPreviewDialog("Preview Advance Application", preview);
            if (!confirm) return;

            try
            {
                await _advanceService.ApplyAdvanceAsync(_advanceId, headerId.Value, amount, userId: 0);
                DialogResult = true;
            }
            catch (ValidationException vex)
            {
                MessageBox.Show(vex.Message, "Validation failed", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            catch (ConcurrencyConflictException cex)
            {
                MessageBox.Show(cex.Message + " Please retry the operation.", "Concurrency conflict", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to apply advance: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private bool ShowPreviewDialog(string title, string message)
        {
            var win = new Window
            {
                Title = title,
                Width = 520,
                Height = 320,
                WindowStartupLocation = WindowStartupLocation.CenterOwner,
                Owner = this,
                Content = new Grid
                {
                    Margin = new Thickness(12),
                    RowDefinitions =
                    {
                        new RowDefinition { Height = GridLength.Auto },
                        new RowDefinition { Height = new GridLength(1, GridUnitType.Star) },
                        new RowDefinition { Height = GridLength.Auto }
                    }
                }
            };

            var grid = (Grid)win.Content;
            var tb = new TextBox
            {
                Text = message,
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                FontFamily = new System.Windows.Media.FontFamily("Consolas")
            };
            Grid.SetRow(tb, 1);
            grid.Children.Add(tb);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            var ok = new Button { Content = "Confirm", IsDefault = true, Margin = new Thickness(0,8,8,0), Padding = new Thickness(12,6,12,6) };
            var cancel = new Button { Content = "Cancel", IsCancel = true, Padding = new Thickness(12,6,12,6) };
            buttons.Children.Add(ok);
            buttons.Children.Add(cancel);
            Grid.SetRow(buttons, 2);
            grid.Children.Add(buttons);

            var result = false;
            ok.Click += (_, __) => { result = true; win.Close(); };
            cancel.Click += (_, __) => { result = false; win.Close(); };

            win.ShowDialog();
            return result;
        }
    }
}
