using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    /// <summary>
    /// Projects view: live search, robust selection mapping, safe save/delete, and error handling
    /// </summary>
    public partial class ProjectsView : UserControl
    {
        private AppDbContext? _db;
        private Project? _selected;
        private readonly DispatcherTimer _searchTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(300) };

        public ProjectsView()
        {
            InitializeComponent();
            Loaded += ProjectsView_Loaded;
            ProjectsGrid.SelectionChanged += ProjectsGrid_SelectionChanged;
            _searchTimer.Tick += async (s, e) => { _searchTimer.Stop(); await LoadProjects(); };

            // Format budget on focus loss
            ProjBudget.LostFocus += (s, e) =>
            {
                if (decimal.TryParse(ProjBudget.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var v))
                    ProjBudget.Text = v.ToString("N2", CultureInfo.InvariantCulture);
            };
        }

        private async void ProjectsView_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try
            {
                // Default status filter to All if not set
                if (StatusFilter.SelectedIndex < 0) StatusFilter.SelectedIndex = 0;

                // Live search hook
                SearchProjects.TextChanged += SearchProjects_TextChanged;

                await LoadProjects();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Projects view failed to load: {ex.Message}", "Projects", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void SearchProjects_TextChanged(object sender, TextChangedEventArgs e)
        {
            _searchTimer.Stop();
            _searchTimer.Start();
        }

        private async void StatusFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded) return;
            await LoadProjects();
        }

        private async Task LoadProjects()
        {
            try
            {
                var status = (StatusFilter.SelectedItem as ComboBoxItem)?.Content as string;
                var query = _db.Projects.AsNoTracking().AsQueryable();
                var search = SearchProjects.Text?.Trim() ?? string.Empty;

                // Prefix match on Name or Client (case-insensitive via LIKE)
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var pattern = search + "%";
                    query = query.Where(p => EF.Functions.Like(p.Name, pattern) || EF.Functions.Like(p.Client, pattern));
                }

                if (!string.IsNullOrEmpty(status) && status != "All")
                {
                    query = query.Where(p => p.Status == status);
                }

                ProjectsGrid.ItemsSource = await query
                    .OrderBy(p => p.Name)
                    .ThenBy(p => p.Client)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load projects: {ex.Message}", "Projects", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ProjectsGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            _selected = ProjectsGrid.SelectedItem as Project;
            if (_selected == null)
            {
                ClearFormFields();
                return;
            }

            // Map model to form
            ProjName.Text = _selected.Name;
            ProjClient.Text = _selected.Client;
            ProjBudget.Text = _selected.Budget.ToString("N2", CultureInfo.InvariantCulture);
            ProjStart.SelectedDate = _selected.StartDate;
            ProjEnd.SelectedDate = _selected.EndDate;

            // Set status combo by text
            var st = _selected.Status;
            ProjStatus.SelectedIndex = -1;
            for (int i = 0; i < ProjStatus.Items.Count; i++)
            {
                if (ProjStatus.Items[i] is ComboBoxItem c && (c.Content as string) == st)
                {
                    ProjStatus.SelectedIndex = i;
                    break;
                }
            }

            ProjDescription.Text = _selected.Description;
        }

        private async void SaveProject_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Basic validation
                var name = ProjName.Text?.Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    MessageBox.Show("Project name is required.", "Projects", MessageBoxButton.OK, MessageBoxImage.Warning);
                    ProjName.Focus();
                    return;
                }

                var isNew = _selected == null;
                var model = isNew ? new Project() : await _db.Projects.FirstAsync(p => p.Id == _selected!.Id); // tracked entity for updates

                model.Name = name;
                model.Client = ProjClient.Text?.Trim() ?? string.Empty;

                // Budget parse
                if (!decimal.TryParse(ProjBudget.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var budget) || budget < 0)
                {
                    MessageBox.Show("Enter a valid non-negative budget.", "Projects", MessageBoxButton.OK, MessageBoxImage.Warning);
                    ProjBudget.Focus();
                    return;
                }
                model.Budget = budget;

                model.StartDate = ProjStart.SelectedDate;
                model.EndDate = ProjEnd.SelectedDate;
                var statusText = (ProjStatus.SelectedItem as ComboBoxItem)?.Content as string;
                model.Status = string.IsNullOrWhiteSpace(statusText) ? "Ongoing" : statusText!;
                model.Description = ProjDescription.Text?.Trim() ?? string.Empty;

                if (isNew) _db.Projects.Add(model);
                await _db.SaveChangesAsync();

                _selected = null;
                ClearFormFields();
                await LoadProjects();
                MessageBox.Show("Project saved", "Projects", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Save failed: {ex.Message}");
            }
        }

        private async void DeleteProject_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_selected == null)
                {
                    MessageBox.Show("Select a project to delete.", "Projects", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                var res = MessageBox.Show($"Delete project '{_selected.Name}'?", "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Warning);
                if (res != MessageBoxResult.Yes) return;

                var tracked = await _db.Projects.FirstOrDefaultAsync(p => p.Id == _selected.Id);
                if (tracked != null)
                {
                    _db.Projects.Remove(tracked);
                    await _db.SaveChangesAsync();
                }

                _selected = null;
                ClearFormFields();
                await LoadProjects();
                MessageBox.Show("Project deleted", "Projects", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Delete failed: {ex.Message}");
            }
        }

        private void ClearProjectForm_Click(object sender, RoutedEventArgs e)
        {
            _selected = null;
            ClearFormFields();
        }

        private void ClearFormFields()
        {
            try
            {
                ProjName.Clear();
                ProjClient.Clear();
                ProjBudget.Clear();
                ProjStart.SelectedDate = null;
                ProjEnd.SelectedDate = null;
                ProjStatus.SelectedIndex = -1;
                ProjDescription.Clear();
                ProjectsGrid.SelectedItem = null;
            }
            catch { }
        }
    }
}
