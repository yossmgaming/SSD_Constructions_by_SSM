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
    public partial class MaterialPurchaseView : UserControl
    {
        private AppDbContext? _db;

        public MaterialPurchaseView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            CreateHeaderButton.Click += OnCreate;
            AddMaterialButton.Click += OnAddMaterial;
            RemoveMaterialButton.Click += OnRemoveMaterial;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }
            await LoadProjects();
            await LoadSuppliers();
            await LoadMaterials();
            MaterialsGrid.ItemsSource = new List<MaterialRow>();
            UpdateTotal();
            UpdateCreateEnabled();

            SupplierCombo.SelectionChanged += (_, __) => UpdateCreateEnabled();
            CustomSupplierBox.TextChanged += (_, __) => UpdateCreateEnabled();
        }

        private async Task LoadProjects()
        {
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            ProjectCombo.ItemsSource = projects;
            ProjectCombo.DisplayMemberPath = "Name";
            ProjectCombo.SelectedValuePath = "Id";
        }

        private async Task LoadSuppliers()
        {
            var suppliers = await _db.Suppliers.AsNoTracking()
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.Name })
                .OrderBy(s => s.Name)
                .ToListAsync();
            SupplierCombo.ItemsSource = suppliers;
            SupplierCombo.DisplayMemberPath = "Name";
            SupplierCombo.SelectedValuePath = "Id";
        }

        private async Task LoadMaterials()
        {
            _materialsCatalog = await _db.Materials.AsNoTracking().OrderBy(m => m.Name).Select(m => new MaterialOption { Id = m.Id, Name = m.Name }).ToListAsync();
            MaterialSelect.ItemsSource = _materialsCatalog;
            MaterialSelect.DisplayMemberPath = "Name";
            MaterialSelect.SelectedValuePath = "Id";
        }

        private sealed class MaterialOption { public int Id { get; set; } public string Name { get; set; } = string.Empty; }
        private List<MaterialOption> _materialsCatalog = new();

        private sealed class MaterialRow
        {
            public int? MaterialId { get; set; }
            public string MaterialName { get; set; } = string.Empty;
            public decimal Quantity { get; set; }
            public decimal UnitRate { get; set; }
            public decimal Amount => Quantity * UnitRate;
            public string Notes { get; set; } = string.Empty;
        }

        private void OnAddMaterial(object? sender, RoutedEventArgs e)
        {
            if (MaterialSelect.SelectedItem == null)
            {
                MessageBox.Show("Select a material.");
                return;
            }
            if (!decimal.TryParse(QuantityBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var qty) || qty <= 0m)
            {
                MessageBox.Show("Enter a valid quantity.");
                return;
            }
            if (!decimal.TryParse(UnitRateBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var rate) || rate <= 0m)
            {
                MessageBox.Show("Enter a valid unit rate.");
                return;
            }

            var opt = MaterialSelect.SelectedItem as MaterialOption;
            var rows = MaterialsGrid.ItemsSource as List<MaterialRow>;
            rows.Add(new MaterialRow
            {
                MaterialId = opt.Id,
                MaterialName = opt.Name,
                Quantity = qty,
                UnitRate = rate,
                Notes = RowNotesBox.Text ?? string.Empty
            });

            MaterialsGrid.ItemsSource = null;
            MaterialsGrid.ItemsSource = rows;
            QuantityBox.Text = string.Empty;
            UnitRateBox.Text = string.Empty;
            RowNotesBox.Text = string.Empty;
            UpdateTotal();
            UpdateCreateEnabled();
        }

        private void OnRemoveMaterial(object? sender, RoutedEventArgs e)
        {
            var rows = MaterialsGrid.ItemsSource as List<MaterialRow>;
            var sel = MaterialsGrid.SelectedItem as MaterialRow;
            if (sel == null) return;
            rows.Remove(sel);
            MaterialsGrid.ItemsSource = null;
            MaterialsGrid.ItemsSource = rows;
            UpdateTotal();
            UpdateCreateEnabled();
        }

        private void UpdateTotal()
        {
            var rows = MaterialsGrid.ItemsSource as IEnumerable<MaterialRow> ?? Enumerable.Empty<MaterialRow>();
            var total = rows.Sum(r => r.Amount);
            TotalAmountText.Text = total.ToString("N2", CultureInfo.CurrentCulture);
        }

        private void UpdateCreateEnabled()
        {
            var supplierId = SupplierCombo.SelectedValue as int?;
            var customSupplier = string.IsNullOrWhiteSpace(CustomSupplierBox.Text) ? null : CustomSupplierBox.Text.Trim();
            var rows = MaterialsGrid.ItemsSource as IEnumerable<MaterialRow> ?? Enumerable.Empty<MaterialRow>();
            CreateHeaderButton.IsEnabled = (supplierId.HasValue || !string.IsNullOrWhiteSpace(customSupplier)) && rows.Any();
        }

        private async void OnCreate(object sender, RoutedEventArgs e)
        {
            try
            {
                var supplierId = SupplierCombo.SelectedValue as int?;
                var customSupplier = string.IsNullOrWhiteSpace(CustomSupplierBox.Text) ? null : CustomSupplierBox.Text.Trim();
                var projectId = ProjectCombo.SelectedValue as int?;
                var purchaseDate = PurchaseDatePicker.SelectedDate ?? DateTime.Today;
                var dueDate = DueDatePicker.SelectedDate;
                var rows = (MaterialsGrid.ItemsSource as IEnumerable<MaterialRow>)?.Where(r => r.MaterialId.HasValue && r.Quantity > 0 && r.UnitRate > 0).ToList() ?? new List<MaterialRow>();
                if ((supplierId == null && string.IsNullOrWhiteSpace(customSupplier)) || rows.Count == 0)
                {
                    MessageBox.Show("Select supplier (or enter a supplier name) and add materials.");
                    return;
                }

                await using var tx = await _db.Database.BeginTransactionAsync();

                var header = new ObligationHeader
                {
                    Type = "MaterialPurchase",
                    Direction = ObligationDirection.Payable,
                    EntityType = EntityType.Supplier,
                    EntityId = supplierId ?? 0,
                    ProjectId = projectId,
                    PeriodStart = purchaseDate.Date,
                    PeriodEnd = purchaseDate.Date,
                    Notes = string.IsNullOrWhiteSpace(customSupplier) ? "Material purchase" : $"Material purchase - {customSupplier}",
                    DueDate = dueDate,
                    Status = ObligationStatus.Pending,
                    IsLocked = false
                };

                foreach (var r in rows)
                {
                    header.Lines.Add(new ObligationLine
                    {
                        Description = r.Notes,
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

                MessageBox.Show("Material purchase recorded.");
                MaterialsGrid.ItemsSource = new List<MaterialRow>();
                UpdateTotal();
                UpdateCreateEnabled();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to record purchase: {ex.Message}");
            }
        }
    }
}
