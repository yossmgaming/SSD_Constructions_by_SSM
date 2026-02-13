using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    /// <summary>
    /// Interaction logic for MaterialsView.xaml
    /// </summary>
    public partial class MaterialsView : UserControl
    {
        private AppDbContext? _db;
        private Material? _selected;

        public MaterialsView()
        {
            InitializeComponent();
            Loaded += MaterialsView_Loaded;
            MaterialsGrid.SelectionChanged += MaterialsGrid_SelectionChanged;

            // Format cost input on focus loss for readability
            MatCost.LostFocus += (s, e) =>
            {
                if (decimal.TryParse(MatCost.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var v))
                    MatCost.Text = v.ToString("N2", CultureInfo.InvariantCulture);
            };
        }

        private async void MaterialsView_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            await LoadMaterials();
        }

        private async Task LoadMaterials(string? search = null)
        {
            var q = _db.Materials.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(m => m.Name.Contains(search) || m.Category.Contains(search));
            MaterialsGrid.ItemsSource = await q.OrderByDescending(m => m.CreatedAt).ToListAsync();
        }

        private void MaterialsGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            _selected = MaterialsGrid.SelectedItem as Material;
            if (_selected == null) return;
            MatName.Text = _selected.Name;
            MatCategory.Text = _selected.Category;
            MatQuantity.Text = _selected.Quantity.ToString(CultureInfo.InvariantCulture);
            MatUnit.Text = _selected.Unit;
            MatCost.Text = _selected.Cost.ToString("N2", CultureInfo.InvariantCulture);
        }

        private void MaterialsGrid_DoubleClick(object sender, MouseButtonEventArgs e)
        {
            // no-op: selection loads fields already
        }

        private async void SearchExistingBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            await LoadMaterials(SearchExistingBox.Text);
        }

        private async void SaveMaterial_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var isNew = _selected == null;
                var model = isNew ? new Material() : _selected!;
                model.Name = MatName.Text?.Trim() ?? string.Empty;
                model.Category = MatCategory.Text?.Trim() ?? string.Empty;
                if (decimal.TryParse(MatQuantity.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty)) model.Quantity = qty; else model.Quantity = 0;
                model.Unit = MatUnit.Text?.Trim() ?? string.Empty;
                if (decimal.TryParse(MatCost.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var cost)) model.Cost = cost; else model.Cost = 0;

                if (isNew) _db.Materials.Add(model); else _db.Materials.Update(model);
                await _db.SaveChangesAsync();
                _selected = null;
                ClearForm_Click(sender, e);
                await LoadMaterials(SearchExistingBox.Text);
                MessageBox.Show("Material saved", "Materials", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Save failed: {ex.Message}", "Materials", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void DeleteMaterial_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_selected == null)
                {
                    MessageBox.Show("Select a material to delete.");
                    return;
                }
                _db.Materials.Remove(_selected);
                await _db.SaveChangesAsync();
                _selected = null;
                ClearForm_Click(sender, e);
                await LoadMaterials(SearchExistingBox.Text);
                MessageBox.Show("Material deleted", "Materials", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Delete failed: {ex.Message}");
            }
        }

        private void ClearForm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MatName.Clear();
                MatCategory.Clear();
                MatQuantity.Clear();
                MatUnit.Clear();
                MatCost.Clear();
                SearchExistingBox.Focus();
                MaterialsGrid.SelectedItem = null;
            }
            catch { }
        }
    }
}
