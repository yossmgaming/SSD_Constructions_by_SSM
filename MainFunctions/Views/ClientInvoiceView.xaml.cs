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
    public partial class ClientInvoiceView : UserControl
    {
        private AppDbContext? _db;

        public ClientInvoiceView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            ProjectCombo.SelectionChanged += OnProjectChanged;
            AddLineButton.Click += OnAddLine;
            RemoveLineButton.Click += OnRemoveLine;
            CreateHeaderButton.Click += OnCreate;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name, p.Client }).ToListAsync();
            ProjectCombo.ItemsSource = projects;
            ProjectCombo.DisplayMemberPath = "Name";
            ProjectCombo.SelectedValuePath = "Id";
            LinesGrid.ItemsSource = new List<InvoiceRow>();
            UpdateCreateEnabled();
        }

        private void OnProjectChanged(object sender, SelectionChangedEventArgs e)
        {
            var item = ProjectCombo.SelectedItem;
            if (item == null)
            {
                ClientText.Text = string.Empty;
                UpdateCreateEnabled();
                return;
            }
            var client = item?.GetType().GetProperty("Client")?.GetValue(item) as string ?? string.Empty;
            ClientText.Text = client;
            UpdateCreateEnabled();
        }

        private sealed class InvoiceRow
        {
            public string Description { get; set; } = string.Empty;
            public decimal Quantity { get; set; }
            public decimal UnitRate { get; set; }
            public decimal Amount => Quantity * UnitRate;
        }

        private void OnAddLine(object? sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(LineDescriptionBox.Text))
            {
                MessageBox.Show("Enter a description for the line.");
                return;
            }
            if (!decimal.TryParse(LineQtyBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var qty) || qty <= 0m)
            {
                MessageBox.Show("Enter a valid quantity.");
                return;
            }
            if (!decimal.TryParse(LineRateBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var rate) || rate <= 0m)
            {
                MessageBox.Show("Enter a valid unit rate.");
                return;
            }

            var rows = LinesGrid.ItemsSource as List<InvoiceRow>;
            if (rows == null)
            {
                rows = new List<InvoiceRow>(); // Initialize if null
            }
            rows.Add(new InvoiceRow { Description = LineDescriptionBox.Text.Trim(), Quantity = qty, UnitRate = rate });
            LinesGrid.ItemsSource = null;
            LinesGrid.ItemsSource = rows;

            LineDescriptionBox.Text = string.Empty;
            LineQtyBox.Text = string.Empty;
            LineRateBox.Text = string.Empty;
            UpdateTotal();
            UpdateCreateEnabled();
        }

        private void OnRemoveLine(object? sender, RoutedEventArgs e)
        {
            var rows = LinesGrid.ItemsSource as List<InvoiceRow>;
            var sel = LinesGrid.SelectedItem as InvoiceRow;
            if (sel == null) return;
            rows.Remove(sel);
            LinesGrid.ItemsSource = null;
            LinesGrid.ItemsSource = rows;
            UpdateTotal();
            UpdateCreateEnabled();
        }

        private void UpdateTotal()
        {
            var rows = LinesGrid.ItemsSource as IEnumerable<InvoiceRow> ?? Enumerable.Empty<InvoiceRow>();
            var total = rows.Sum(r => r.Amount);
            TotalAmountText.Text = total.ToString("N2", CultureInfo.CurrentCulture);
        }

        private void UpdateCreateEnabled()
        {
            var projectId = ProjectCombo.SelectedValue as int?;
            var rows = LinesGrid.ItemsSource as IEnumerable<InvoiceRow> ?? Enumerable.Empty<InvoiceRow>();
            CreateHeaderButton.IsEnabled = projectId.HasValue && rows.Any();
        }

        private async void OnCreate(object sender, RoutedEventArgs e)
        {
            try
            {
                var projectId = ProjectCombo.SelectedValue as int?;
                var due = DueDatePicker.SelectedDate;
                var rows = (LinesGrid.ItemsSource as IEnumerable<InvoiceRow>)?.Where(r => r.Quantity > 0 && r.UnitRate > 0 && !string.IsNullOrWhiteSpace(r.Description)).ToList() ?? new List<InvoiceRow>();
                if (!projectId.HasValue || rows.Count == 0)
                {
                    MessageBox.Show("Select project and add lines.");
                    return;
                }

                if (_db == null)
                {
                    MessageBox.Show("Database context not initialized.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }
                var proj = await _db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId.Value);

                await using var tx = await _db.Database.BeginTransactionAsync();

                var header = new ObligationHeader
                {
                    Type = "ClientInvoice",
                    Direction = ObligationDirection.Receivable,
                    EntityType = EntityType.Client,
                    EntityId = null, // client is derived from project
                    ProjectId = projectId.Value,
                    PeriodStart = DateTime.Today,
                    PeriodEnd = DateTime.Today,
                    Notes = "Client invoice",
                    DueDate = due,
                    Status = ObligationStatus.Pending,
                    IsLocked = false
                };

                foreach (var r in rows)
                {
                    header.Lines.Add(new ObligationLine
                    {
                        Description = r.Description,
                        Quantity = r.Quantity,
                        UnitRate = r.UnitRate,
                        Amount = decimal.Round(r.Quantity * r.UnitRate, 2)
                    });
                }

                header.TotalAmountSnapshot = header.Lines.Sum(l => l.Amount);
                header.Status = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, header.TotalAmountSnapshot, 0m);
                header.IsLocked = header.Status == ObligationStatus.Paid;

                _db.ObligationHeaders.Add(header);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                MessageBox.Show("Invoice created.");
                LinesGrid.ItemsSource = new List<InvoiceRow>();
                UpdateTotal();
                UpdateCreateEnabled();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to create invoice: {ex.Message}");
            }
        }
    }
}
