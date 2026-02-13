#nullable disable
#pragma warning disable CS8602

using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    /// <summary>
    /// Interaction logic for BOQGenerator.xaml
    /// </summary>
    public partial class BOQGenerator : UserControl
    {
        // Observable collection bound to the DataGrid
        private ObservableCollection<BoqItem> _items = new ObservableCollection<BoqItem>();
        private IBoqService? _boqService;
        private AppDbContext? _db;

        private Boq? _currentBoq; // make nullable to fix CS8618

        public BOQGenerator()
        {
            InitializeComponent();

            BOQGrid.ItemsSource = _items;

            // Wire up button events
            BOQAddButton.Click += BOQAddButton_Click;
            BOQUpdateButton.Click += BOQUpdateButton_Click;
            BOQDeleteButton.Click += BOQDeleteButton_Click;
            BOQClearButton.Click += BOQClearButton_Click;
            SaveBoqButton.Click += SaveBoqButton_Click;
            ExportPdfButton.Click += ExportPdfButton_Click;
            ExportExcelButton.Click += ExportExcelButton_Click;

            // Wire up selection changed
            BOQGrid.SelectionChanged += BOQGrid_SelectionChanged;

            // Wire up input change events to recalc amount
            InputQuantity.TextChanged += InputQuantityOrRate_TextChanged;
            InputRate.TextChanged += InputQuantityOrRate_TextChanged;

            // create context and service
            // _db = new AppDbContext(); // Removed
            // _boqService = new BoqService(_db); // Removed

            Loaded += BOQGenerator_Loaded;
        }

        private async void BOQGenerator_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            _boqService = new BoqService(_db);
            // load latest BOQ if exists
            _currentBoq = await _boqService.GetLatestBoqAsync();
            if (_currentBoq != null)
            {
                ProjectTitleTextBox.Text = _currentBoq.Title;
                ToAddressTextBox.Text = _currentBoq.ToAddress;
                BoqNotesTextBox.Text = _currentBoq.Notes;
                if (_currentBoq.DocumentDate.HasValue)
                    DocumentDate.SelectedDate = _currentBoq.DocumentDate.Value;

                // load items
                _items.Clear();
                foreach (var item in (_currentBoq.Items ?? Enumerable.Empty<BoqItem>()))
                {
                    _items.Add(item);
                }

                RecalculateGrandTotal();
            }
        }

        private async void SaveBoqButton_Click(object sender, RoutedEventArgs e)
        {
            if (_db == null || _boqService == null) return;
            // Create BOQ header or update existing
            if (_currentBoq == null)
            {
                var title = string.IsNullOrWhiteSpace(ProjectTitleTextBox.Text) ? "Untitled BOQ" : ProjectTitleTextBox.Text.Trim();
                var toAddr = ToAddressTextBox.Text?.Trim() ?? string.Empty;
                var notes = BoqNotesTextBox.Text?.Trim() ?? string.Empty;
                var date = DocumentDate.SelectedDate;

                _currentBoq = await _boqService.CreateBoqAsync(title, toAddr, notes, date);
            }
            else
            {
                // update header
                _currentBoq.Title = ProjectTitleTextBox.Text?.Trim() ?? string.Empty;
                _currentBoq.ToAddress = ToAddressTextBox.Text?.Trim() ?? string.Empty;
                _currentBoq.Notes = BoqNotesTextBox.Text?.Trim() ?? string.Empty;
                _currentBoq.DocumentDate = DocumentDate.SelectedDate;
                _db.Boqs.Update(_currentBoq);
                await _db.SaveChangesAsync();
            }

            // persist items
            foreach (var itm in _items)
            {
                // if item already has Id (>0) update, else add
                if (itm.Id > 0)
                {
                    await _boqService.UpdateItemAsync(itm);
                }
                else
                {
                    await _boqService.AddItemAsync(_currentBoq!.Id, itm);
                }
            }

            RecalculateGrandTotal();
            MessageBox.Show("BOQ saved.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void InputField_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            // Use PreviewKeyDown for more reliable handling including TextBox with AcceptsReturn
            if (e.Key == Key.Right || e.Key == Key.Down)
            {
                MoveFocusNext(sender as UIElement);
                e.Handled = true;
            }
            else if (e.Key == Key.Left || e.Key == Key.Up)
            {
                MoveFocusPrevious(sender as UIElement);
                e.Handled = true;
            }
        }

        private void MoveFocusNext(UIElement? current)
        {
            if (current == null) return;

            // Order of controls: ItemNo -> Description -> Quantity -> Unit -> Rate -> Amount
            if (current == InputItemNo) InputDescription.Focus();
            else if (current == InputDescription) InputQuantity.Focus();
            else if (current == InputQuantity) InputUnit.Focus();
            else if (current == InputUnit) InputRate.Focus();
            else if (current == InputRate) InputAmount.Focus();
            else if (current == InputAmount) InputItemNo.Focus();
        }

        private void MoveFocusPrevious(UIElement? current)
        {
            if (current == null) return;

            if (current == InputItemNo) InputAmount.Focus();
            else if (current == InputDescription) InputItemNo.Focus();
            else if (current == InputQuantity) InputDescription.Focus();
            else if (current == InputUnit) InputQuantity.Focus();
            else if (current == InputRate) InputUnit.Focus();
            else if (current == InputAmount) InputRate.Focus();
        }

        private void BOQAddButton_Click(object sender, RoutedEventArgs e)
        {
            var item = CreateItemFromInputs();
            if (item == null) return;

            _items.Add(item);
            RecalculateGrandTotal();
            ClearInputs();
        }

        private void BOQUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            if (BOQGrid.SelectedItem is BoqItem selected)
            {
                var updated = CreateItemFromInputs();
                if (updated == null) return;

                // Update properties
                selected.ItemNo = updated.ItemNo;
                selected.Description = updated.Description;
                selected.Quantity = updated.Quantity;
                selected.Unit = updated.Unit;
                selected.Rate = updated.Rate;
                selected.Amount = updated.Amount;

                // Refresh grid (INotifyPropertyChanged will notify)
                RecalculateGrandTotal();
                BOQGrid.Items.Refresh();
            }
            else
            {
                MessageBox.Show("Select a row to update.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private async void BOQDeleteButton_Click(object sender, RoutedEventArgs e)
        {
            if (BOQGrid.SelectedItem is BoqItem selected)
            {
                _items.Remove(selected);
                RecalculateGrandTotal();
                ClearInputs();

                // If it existed in DB, delete there too
                if (selected.Id > 0)
                {
                    await _boqService.DeleteItemAsync(selected.Id);
                }
            }
            else
            {
                MessageBox.Show("Select a row to delete.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void BOQClearButton_Click(object sender, RoutedEventArgs e)
        {
            ClearInputs();
            BOQGrid.SelectedItem = null;
        }

        private void BOQGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (BOQGrid.SelectedItem is BoqItem selected)
            {
                InputItemNo.Text = selected.ItemNo;
                InputDescription.Text = selected.Description;
                InputQuantity.Text = selected.Quantity.ToString(CultureInfo.InvariantCulture);
                // set unit selection
                if (!string.IsNullOrEmpty(selected.Unit))
                {
                    var match = InputUnit.Items.Cast<object>().OfType<ComboBoxItem>().FirstOrDefault(c => (c.Content as string) == selected.Unit);
                    if (match != null) InputUnit.SelectedItem = match;
                    else InputUnit.Text = selected.Unit;
                }
                else
                {
                    InputUnit.SelectedIndex = -1;
                }

                InputRate.Text = selected.Rate.ToString(CultureInfo.InvariantCulture);
                InputAmount.Text = selected.Amount.ToString("0.00", CultureInfo.InvariantCulture);
            }
        }

        private void InputQuantityOrRate_TextChanged(object sender, TextChangedEventArgs e)
        {
            // Try parse qty and rate and set amount field
            if (decimal.TryParse(InputQuantity.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty)
                && decimal.TryParse(InputRate.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var rate))
            {
                var amount = qty * rate;
                InputAmount.Text = amount.ToString("0.00", CultureInfo.InvariantCulture);
            }
            else
            {
                InputAmount.Text = string.Empty;
            }
        }

        private BoqItem? CreateItemFromInputs()
        {
            // Validate and parse inputs
            var itemNo = InputItemNo.Text?.Trim() ?? string.Empty;
            var description = InputDescription.Text?.Trim() ?? string.Empty;

            if (!decimal.TryParse(InputQuantity.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty))
            {
                MessageBox.Show("Invalid quantity.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Warning);
                return null;
            }

            string unit;
            if (InputUnit.SelectedItem is ComboBoxItem cbi)
                unit = cbi.Content as string ?? string.Empty;
            else
                unit = InputUnit.Text ?? string.Empty;

            if (!decimal.TryParse(InputRate.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var rate))
            {
                MessageBox.Show("Invalid rate.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Warning);
                return null;
            }

            var amount = qty * rate;

            return new BoqItem
            {
                ItemNo = itemNo,
                Description = description,
                Quantity = qty,
                Unit = unit,
                Rate = rate,
                Amount = amount
            };
        }

        private void ClearInputs()
        {
            InputItemNo.Clear();
            InputDescription.Clear();
            InputQuantity.Clear();
            InputUnit.SelectedIndex = -1;
            InputRate.Clear();
            InputAmount.Clear();
        }

        // Call this after items are added/updated/deleted and after save
        private void RecalculateGrandTotal()
        {
            var total = _items.Sum(i => i.Amount);
            // If you prefer setting text directly instead of binding:
            GrandTotalText.Text = $"LKR {total.ToString("N2", CultureInfo.CurrentCulture)}";
        }

        private void ExportExcelButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var sfd = new Microsoft.Win32.SaveFileDialog
                {
                    Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*",
                    FileName = ($"BOQ_{_currentBoq?.Title ?? "Untitled"}").Replace(' ', '_') + ".csv"
                };
                if (sfd.ShowDialog() == true)
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("Item,Description,Qty,Unit,Rate,Amount");
                    foreach (var i in _items)
                    {
                        sb.AppendLine($"{Escape(i.ItemNo)},{Escape(i.Description)},{i.Quantity.ToString("N2")},{Escape(i.Unit)},{i.Rate.ToString("N2")},{i.Amount.ToString("N2")}");
                    }
                    var total = _items.Sum(x => x.Amount);
                    sb.AppendLine($"Total,,,,,{total.ToString("N2")}");
                    File.WriteAllText(sfd.FileName, sb.ToString(), Encoding.UTF8);
                    MessageBox.Show("Exported to CSV.", "BOQ", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Export failed: {ex.Message}", "BOQ", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ExportPdfButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var doc = BuildFixedDocument();
                var dlg = new PrintDialog();
                if (dlg.ShowDialog() == true)
                {
                    dlg.PrintDocument(doc.DocumentPaginator, $"BOQ - {_currentBoq?.Title ?? "Untitled BOQ"}");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Print failed: {ex.Message}", "BOQ", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private FixedDocument BuildFixedDocument()
        {
            const double dpi = 96;
            var pageWidth = 8.27 * dpi;   // ~794
            var pageHeight = 11.69 * dpi; // ~1123
            var margin = new Thickness(96, 40, 96, 40); // 1" left/right, 40px top/bottom
            var headerHeight = 200; // more space for stacked header
            var footerHeight = 60;
            var contentTop = headerHeight + margin.Top;
            var contentBottom = pageHeight - margin.Bottom - footerHeight;
            var contentHeight = contentBottom - contentTop;

            var doc = new FixedDocument();
            doc.DocumentPaginator.PageSize = new Size(pageWidth, pageHeight);

            var rows = _items.ToList();
            int pageIndex = 0;
            int rowIndex = 0;

            const double rowHeight = 28;
            var tableHeaderHeight = 32;

            while (rowIndex < rows.Count || rows.Count == 0)
            {
                var page = new FixedPage { Width = pageWidth, Height = pageHeight, Background = Brushes.White };

                var root = new Grid { Margin = margin };
                root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(headerHeight) });
                root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
                root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(footerHeight) });
                page.Children.Add(root);

                var header = BuildHeader();
                Grid.SetRow(header, 0);
                root.Children.Add(header);

                var content = new StackPanel { Orientation = Orientation.Vertical };
                Grid.SetRow(content, 1);
                root.Children.Add(content);

                // To address section (left side)
                content.Children.Add(BuildToAddress());

                // Centered BOQ title, bold, underline
                var title = new TextBlock
                {
                    Text = "BILL OF QUANTITIES",
                    FontSize = 18,
                    FontWeight = FontWeights.Bold,
                    TextDecorations = TextDecorations.Underline,
                    TextAlignment = TextAlignment.Center,
                    Margin = new Thickness(0, 10, 0, 10)
                };
                content.Children.Add(title);

                // Table header and rows
                content.Children.Add(BuildTableHeader());

                var availableForRows = contentHeight - tableHeaderHeight - 60; // account for To address + title
                var rowsPerPage = Math.Max(1, (int)(availableForRows / rowHeight));

                int take = Math.Min(rowsPerPage, rows.Count - rowIndex);
                for (int i = 0; i < take; i++)
                    content.Children.Add(BuildTableRow(rows[rowIndex + i]));

                rowIndex += take;

                if (rows.Count == 0 && pageIndex == 0)
                {
                    content.Children.Add(BuildTableRow(null));
                    rowIndex = 1;
                }

                var footer = BuildFooter(pageIndex + 1, 0);
                Grid.SetRow(footer, 2);
                root.Children.Add(footer);

                var pageContent = new PageContent { Child = page };
                doc.Pages.Add(pageContent);

                pageIndex++;
                if (rowIndex >= rows.Count) break;
            }

            int totalPages = doc.Pages.Count;
            for (int i = 0; i < totalPages; i++)
            {
                var pageContent = doc.Pages[i];
                var fixedPage = (FixedPage)pageContent.Child;
                var root = (Grid)fixedPage.Children[0];
                var footer = (Grid)root.Children[2];
                var pageNoCenter = (TextBlock)footer.Tag; // center text stored in Tag
                pageNoCenter.Text = $"Page {i + 1} of {totalPages}";
            }

            return doc;
        }

        private Grid BuildHeader()
        {
            // Stack layout per spec: Top-left logo, then SSD Constructions, then phone, then email
            var header = new Grid();
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) }); // logo column
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var leftStack = new StackPanel { Orientation = Orientation.Vertical };
            // Logo at top-left
            var logo = new Image { Stretch = Stretch.Uniform, Width = 100, Height = 100, Margin = new Thickness(0, 0, 0, 8) };
            // Try pack resource Assets/logo.png
            try
            {
                var uri = new Uri("pack://application:,,,/Assets/logo.png", UriKind.Absolute);
                logo.Source = new BitmapImage(uri);
            }
            catch { }
            leftStack.Children.Add(logo);
            leftStack.Children.Add(new TextBlock { Text = "SSD Constructions", FontSize = 18, FontWeight = FontWeights.Bold });
            leftStack.Children.Add(new TextBlock { Text = "0774 286 106 / 0765 711 938" });
            leftStack.Children.Add(new TextBlock { Text = "ssdconstructions2020@gmail.com" });
            Grid.SetColumn(leftStack, 0);
            header.Children.Add(leftStack);

            // Right column optional: date
            var right = new StackPanel { Orientation = Orientation.Vertical, HorizontalAlignment = HorizontalAlignment.Right };
            right.Children.Add(new TextBlock { Text = $"Date: {(DocumentDate.SelectedDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"))}" });
            Grid.SetColumn(right, 1);
            header.Children.Add(right);

            return header;
        }

        private UIElement BuildToAddress()
        {
            var panel = new StackPanel { Orientation = Orientation.Vertical, Margin = new Thickness(0, 4, 0, 8) };
            panel.Children.Add(new TextBlock { Text = "To:", FontWeight = FontWeights.SemiBold });
            panel.Children.Add(new TextBlock { Text = ToAddressTextBox.Text, TextWrapping = TextWrapping.Wrap });
            // Project meta under To address, left side as part of content
            panel.Children.Add(new TextBlock { Text = $"Project: {_currentBoq?.Title ?? "Untitled BOQ"}" });
            return panel;
        }

        private Grid BuildFooter(int pageNumber, int totalPages)
        {
            // Footer with left-bottom SSD text and centered page X of Y
            var footer = new Grid { Tag = new TextBlock() };
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var left = new TextBlock
            {
                Text = "SSD CONSTRUCTIONS - CPC/DS/KU/4717",
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            Grid.SetColumn(left, 0);
            footer.Children.Add(left);

            var pageNoCenter = (TextBlock)footer.Tag;
            pageNoCenter.Text = $"Page {pageNumber}";
            pageNoCenter.VerticalAlignment = VerticalAlignment.Center;
            pageNoCenter.HorizontalAlignment = HorizontalAlignment.Center;
            Grid.SetColumn(pageNoCenter, 1);
            footer.Children.Add(pageNoCenter);

            return footer;
        }

        private Grid BuildTableHeader()
        {
            var grid = CreateTableRowGrid();
            AddHeaderCell(grid, 0, "Item");
            AddHeaderCell(grid, 1, "Description");
            AddHeaderCell(grid, 2, "Qty");
            AddHeaderCell(grid, 3, "Unit");
            AddHeaderCell(grid, 4, "Rate");
            AddHeaderCell(grid, 5, "Amount");
            return grid;
        }

        private UIElement BuildTableRow(BoqItem? item)
        {
            var grid = CreateTableRowGrid();
            AddBodyCell(grid, 0, item?.ItemNo ?? "");
            AddBodyCell(grid, 1, item?.Description ?? "");
            AddBodyCell(grid, 2, item != null ? item.Quantity.ToString("N2") : "");
            AddBodyCell(grid, 3, item?.Unit ?? "");
            AddBodyCell(grid, 4, item != null ? item.Rate.ToString("N2") : "");
            AddBodyCell(grid, 5, item != null ? item.Amount.ToString("N2") : "");
            return grid;
        }

        private Grid CreateTableRowGrid()
        {
            var grid = new Grid { Margin = new Thickness(0, 2, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(70) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(90) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(80) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(130) });
            return grid;
        }

        private void AddHeaderCell(Grid grid, int column, string text)
        {
            var border = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(240, 240, 240)),
                BorderBrush = Brushes.LightGray,
                BorderThickness = new Thickness(0, 0, 0, 1)
            };
            var tb = new TextBlock
            {
                Text = text,
                FontWeight = FontWeights.SemiBold,
                Padding = new Thickness(6, 4, 6, 4),
                TextAlignment = (column >= 2) ? TextAlignment.Right : TextAlignment.Left
            };
            border.Child = tb;
            Grid.SetColumn(border, column);
            grid.Children.Add(border);
        }

        private void AddBodyCell(Grid grid, int column, string text)
        {
            var border = new Border
            {
                BorderBrush = Brushes.Gainsboro,
                BorderThickness = new Thickness(0, 0, 0, 1)
            };
            var tb = new TextBlock
            {
                Text = text,
                Padding = new Thickness(6, 4, 6, 4),
                TextAlignment = (column >= 2) ? TextAlignment.Right : TextAlignment.Left,
                TextWrapping = column == 1 ? TextWrapping.Wrap : TextWrapping.NoWrap
            };
            border.Child = tb;
            Grid.SetColumn(border, column);
            grid.Children.Add(border);
        }

        private string Escape(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var v = value.Replace("\"", "\"\"");
            if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
            {
                return $"\"{v}\"";
            }
            return v;
        }
#pragma warning restore CS8602
    }
}
