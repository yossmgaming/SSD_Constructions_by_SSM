using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;

namespace MainFunctions.Views
{
    public class ApplyAdvanceDialog : Window
    {
        private readonly AppDbContext _db;
        private readonly int _advanceId;
        private readonly decimal _remaining;
        private ComboBox _headerCombo = new ComboBox();
        private TextBox _amountBox = new TextBox();
        private Button _applyButton = new Button { Content = "Apply" };
        private Button _cancelButton = new Button { Content = "Cancel" };

        public ApplyAdvanceDialog(AppDbContext db, int advanceId, decimal remaining)
        {
            _db = db;
            _advanceId = advanceId;
            _remaining = remaining;

            Title = "Apply Advance";
            Width = 420;
            Height = 220;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;

            var grid = new Grid { Margin = new Thickness(12) };
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            var headerLabel = new TextBlock { Text = "Obligation Header", Margin = new Thickness(0,0,0,4) };
            Grid.SetRow(headerLabel, 0);
            grid.Children.Add(headerLabel);

            _headerCombo.IsEditable = true;
            _headerCombo.IsTextSearchEnabled = true;
            Grid.SetRow(_headerCombo, 1);
            grid.Children.Add(_headerCombo);

            var amountLabel = new TextBlock { Text = "Amount (LKR)", Margin = new Thickness(0,8,0,4) };
            Grid.SetRow(amountLabel, 2);
            grid.Children.Add(amountLabel);

            _amountBox.Margin = new Thickness(0,0,0,8);
            Grid.SetRow(_amountBox, 3);
            grid.Children.Add(_amountBox);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
            buttons.Children.Add(_applyButton);
            buttons.Children.Add(_cancelButton);
            Grid.SetRow(buttons, 4);
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.Children.Add(buttons);

            Content = grid;

            Loaded += OnLoaded;
            _applyButton.Click += OnApply;
            _cancelButton.Click += (_, __) => DialogResult = false;
        }

        private void OnLoaded(object? sender, EventArgs e)
        {
            var headers = _db.ObligationHeaders.AsNoTracking()
                .OrderByDescending(h => h.PeriodEnd)
                .Select(h => new { h.Id, Label = $"#{h.Id} � {h.Type} � {h.PeriodStart:yyyy-MM-dd} to {h.PeriodEnd:yyyy-MM-dd}" })
                .ToList();
            _headerCombo.ItemsSource = headers;
            _headerCombo.DisplayMemberPath = "Label";
            _headerCombo.SelectedValuePath = "Id";
        }

        private async void OnApply(object? sender, EventArgs e)
        {
            try
            {
                var headerId = _headerCombo.SelectedValue as int?;
                if (!headerId.HasValue)
                {
                    MessageBox.Show("Select an obligation header.");
                    return;
                }
                if (!decimal.TryParse(_amountBox.Text, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var amount) || amount <= 0m)
                {
                    MessageBox.Show("Enter a valid amount.");
                    return;
                }

                // Use a transaction to ensure atomic check-and-insert
                await using var tx = await _db.Database.BeginTransactionAsync();
                try
                {
                    // Recompute remaining for the advance inside transaction
                    var remaining = await _db.CashSettlements.AsNoTracking()
                        .Where(s => s.Id == _advanceId)
                        .Select(s => new
                        {
                            s.Amount,
                            Remaining = EF.Property<decimal?>(s, "RemainingAmount")
                        })
                        .FirstOrDefaultAsync();

                    decimal remValue = 0m;
                    if (remaining != null)
                    {
                        remValue = remaining.Remaining ?? (remaining.Amount - (await _db.AdvanceApplications.Where(a => a.AdvanceSettlementId == _advanceId).Select(a => a.AppliedAmount).ToListAsync()).Sum());
                    }
                    else
                    {
                        remValue = (await _db.CashSettlements.AsNoTracking().Where(s => s.Id == _advanceId).Select(s => s.Amount).FirstOrDefaultAsync())
                                   - (await _db.AdvanceApplications.AsNoTracking().Where(a => a.AdvanceSettlementId == _advanceId).Select(a => a.AppliedAmount).ToListAsync()).Sum();
                    }

                    if (amount > remValue)
                    {
                        MessageBox.Show("Amount exceeds remaining balance.");
                        tx.Rollback();
                        return;
                    }

                    // Per-obligation cap: cannot exceed header balance
                    var header = await _db.ObligationHeaders.Include(h => h.Lines).FirstAsync(h => h.Id == headerId.Value);
                    var appliedToHeader = (await _db.CashSettlements.AsNoTracking().Where(s => s.ObligationHeaderId == header.Id && !s.IsReversal).Select(s => s.Amount).ToListAsync()).Sum()
                                            + (await _db.AdvanceApplications.AsNoTracking().Where(a => a.ObligationHeaderId == header.Id).Select(a => a.AppliedAmount).ToListAsync()).Sum();
                    var headerBalance = header.Lines.Sum(l => l.Amount) - appliedToHeader;
                    if (amount > headerBalance)
                    {
                        MessageBox.Show("Amount exceeds header balance.");
                        tx.Rollback();
                        return;
                    }

                    _db.AdvanceApplications.Add(new AdvanceApplication
                    {
                        AdvanceSettlementId = _advanceId,
                        ObligationHeaderId = header.Id,
                        AppliedAmount = amount,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync();

                    await tx.CommitAsync();
                    DialogResult = true;
                }
                catch (DbUpdateException dbex)
                {
                    // Likely triggered by DB constraints/triggers (e.g., over-apply)
                    MessageBox.Show($"Failed to apply advance: {dbex.InnerException?.Message ?? dbex.Message}");
                    tx.Rollback();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to apply advance: {ex.Message}");
                    tx.Rollback();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to apply advance: {ex.Message}");
            }
        }
    }
}
