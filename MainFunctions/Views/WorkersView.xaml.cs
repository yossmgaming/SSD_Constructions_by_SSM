#nullable disable
#pragma warning disable CS8602, CS8604

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
    /// Interaction logic for WorkersView.xaml
    /// </summary>
    public partial class WorkersView : UserControl
    {
        private AppDbContext? _db;
        private Worker? _selected;

        // Special value to represent None selection in AssignProjectBox
        private const int NoneProjectId = -1;

        // Debounce timer for live search
        private readonly DispatcherTimer _searchTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(300) };

        public WorkersView()
        {
            InitializeComponent();
            Loaded += WorkersView_Loaded;
            WorkersGrid.SelectionChanged += WorkersGrid_SelectionChanged;

            // Live search wiring
            _searchTimer.Tick += async (s, e) => { _searchTimer.Stop(); await LoadWorkers(); };
        }

        private async void WorkersView_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            if (RoleFilter != null && RoleFilter.SelectedIndex < 0)
            {
                RoleFilter.SelectedIndex = 0; // "All Roles"
            }

            // Hook text change after InitializeComponent ensures controls instantiated
            SearchWorkers.TextChanged += SearchBoxes_TextChanged;
            SearchNIC.TextChanged += SearchBoxes_TextChanged;
            RoleFilter.SelectionChanged += RoleFilter_SelectionChanged;

            await LoadProjectsIntoAssignBox();
            await LoadWorkers();

            // Example: default to counting weekends; can be toggled via a settings UI later
            AttendanceSettings.CountWeekends = true;
        }

        private void SearchBoxes_TextChanged(object sender, TextChangedEventArgs e)
        {
            // Restart debounce timer to avoid querying on every keystroke
            _searchTimer.Stop();
            _searchTimer.Start();
        }

        private async Task LoadProjectsIntoAssignBox()
        {
            try
            {
                if (_db == null) return;
                var list = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).ToListAsync();

                // Insert a synthetic "None" option at the top allowing removal from any project
                AssignProjectBox.Items.Clear();
                var noneItem = new ComboBoxItem { Content = "None", Tag = NoneProjectId };
                AssignProjectBox.Items.Add(noneItem);

                foreach (var p in list)
                {
                    var item = new ComboBoxItem { Content = p.Name, Tag = p.Id };
                    AssignProjectBox.Items.Add(item);
                }

                AssignProjectBox.SelectedIndex = 0; // default to None
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load projects: {ex.Message}", "Workers", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task LoadWorkers()
        {
            if (!IsLoaded || WorkersGrid == null || _db == null) return;

            var role = (RoleFilter.SelectedItem as ComboBoxItem)?.Content as string;
            var nameText = SearchWorkers.Text?.Trim() ?? string.Empty;
            var nicText = SearchNIC.Text?.Trim() ?? string.Empty;

            var q = _db.Workers.AsNoTracking().AsQueryable();

            // Apply role filter first if any
            if (!string.IsNullOrEmpty(role) && role != "All Roles") q = q.Where(w => w.Role == role);

            // Name or NIC prefix search (OR semantics). If both provided, broaden with OR
            if (!string.IsNullOrWhiteSpace(nameText) || !string.IsNullOrWhiteSpace(nicText))
            {
                var hasName = !string.IsNullOrWhiteSpace(nameText);
                var hasNic = !string.IsNullOrWhiteSpace(nicText);
                if (hasName && hasNic)
                {
                    var namePattern = nameText + "%";
                    var nicPattern = nicText + "%";
                    q = q.Where(w => EF.Functions.Like(w.FullName, namePattern) || EF.Functions.Like(w.NIC, nicPattern));
                }
                else if (hasName)
                {
                    var namePattern = nameText + "%";
                    q = q.Where(w => EF.Functions.Like(w.FullName, namePattern));
                }
                else // hasNic
                {
                    var nicPattern = nicText + "%";
                    q = q.Where(w => EF.Functions.Like(w.NIC, nicPattern));
                }
            }

            WorkersGrid.ItemsSource = await q.OrderBy(w => w.FullName).ThenBy(w => w.NIC).ToListAsync();
        }
        private async void WorkersGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_db == null) return;
            _selected = WorkersGrid.SelectedItem as Worker;
            if (_selected == null)
            {
                CurrentAssignmentText.Text = "Current: None";
                AssignmentHistoryList.ItemsSource = null;
                AssignProjectBox.SelectedIndex = 0; // None
                AssignFromDate.SelectedDate = null;
                AssignToDate.SelectedDate = null;
                return;
            }

            WorkerName.Text = _selected!.FullName;
            WorkerNIC.Text = _selected!.NIC;

            // set role
            var r = _selected!.Role;
            for (int i = 0; i < WorkerRole.Items.Count; i++)
            {
                var c = WorkerRole.Items[i] as ComboBoxItem;
                if ((c?.Content as string) == r) { WorkerRole.SelectedIndex = i; break; }
            }
            WorkerRate.Text = _selected!.DailyRate.ToString("N2", CultureInfo.InvariantCulture);
            WorkerPhone.Text = _selected!.Phone;
            WorkerPhone2.Text = _selected!.Phone2;
            var s = _selected!.Status;
            for (int i = 0; i < WorkerStatus.Items.Count; i++)
            {
                var c = WorkerStatus.Items[i] as ComboBoxItem;
                if ((c?.Content as string) == s) { WorkerStatus.SelectedIndex = i; break; }
            }
            WorkerNotes.Text = _selected.Notes;

            // consider current if no end date OR end date in future
            var today = DateTime.Today;
            var current = await _db.ProjectWorkers
                .AsNoTracking()
                .Where(pw => pw.WorkerId == _selected.Id && (pw.AssignedTo == null || pw.AssignedTo >= today))
                .Include(pw => pw.Project)
                .OrderByDescending(pw => pw.AssignedFrom)
                .FirstOrDefaultAsync();

            if (current != null)
            {
                var from = current.AssignedFrom?.ToString("yyyy-MM-dd") ?? "";
                var to = current.AssignedTo?.ToString("yyyy-MM-dd");
                CurrentAssignmentText.Text = to == null
                    ? $"Current: {current.Project?.Name ?? "(Deleted)"} from {from}"
                    : $"Current: {current.Project?.Name ?? "(Deleted)"} {from} to {to}";

                // Select the corresponding item by Tag
                for (int i = 0; i < AssignProjectBox.Items.Count; i++)
                {
                    if (AssignProjectBox.Items[i] is ComboBoxItem cbi && cbi.Tag is int id && id == current.ProjectId)
                    {
                        AssignProjectBox.SelectedIndex = i;
                        break;
                    }
                }
            }
            else
            {
                CurrentAssignmentText.Text = "Current: None";
                AssignProjectBox.SelectedIndex = 0; // None
            }

            // Build assignment history with conflict highlighting
            var all = await _db.ProjectWorkers
                .AsNoTracking()
                .Where(pw => pw.WorkerId == _selected.Id)
                .Include(pw => pw.Project)
                .OrderBy(pw => pw.AssignedFrom)
                .ToListAsync();

            var conflict = new bool[all.Count];
            for (int i = 0; i < all.Count; i++)
            {
                var a = all[i];
                var aS = (a.AssignedFrom ?? DateTime.MinValue).Date;
                var aE = (a.AssignedTo ?? DateTime.MaxValue).Date;
                for (int j = i + 1; j < all.Count; j++)
                {
                    var b = all[j];
                    var bS = (b.AssignedFrom ?? DateTime.MinValue).Date;
                    var bE = (b.AssignedTo ?? DateTime.MaxValue).Date;
                    if (aS <= bE && bS <= aE)
                    {
                        conflict[i] = true;
                        conflict[j] = true;
                    }
                }
            }

            var history = all
                .Select((pw, idx) =>
                {
                    var from = pw.AssignedFrom?.ToString("yyyy-MM-dd") ?? "(unknown)";
                    var to = pw.AssignedTo?.ToString("yyyy-MM-dd") ?? "present";
                    var proj = pw.Project != null ? pw.Project.Name : "(Deleted Project)";
                    var prefix = conflict[idx] ? "⚠ " : string.Empty;
                    return $"{prefix}{from} → {to} • {proj}";
                })
                .ToList();

            AssignmentHistoryList.ItemsSource = history;

            AssignFromDate.SelectedDate = today;
            AssignToDate.SelectedDate = null;
        }

        private async Task<int?> ResolveProjectIdFromCombo()
        {
            // Prefer Tag on ComboBoxItem
            if (AssignProjectBox.SelectedItem is ComboBoxItem cbi && cbi.Tag is int id)
            {
                return id == NoneProjectId ? (int?)null : id;
            }
            if (AssignProjectBox.SelectedValue is int v1) return v1 == NoneProjectId ? (int?)null : v1;
            if (AssignProjectBox.SelectedItem is Project p) return p.Id;
            var text = (AssignProjectBox.Text ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(text)) return null;
            if (string.Equals(text, "None", StringComparison.OrdinalIgnoreCase)) return null;
            var proj = await _db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Name.ToLower() == text.ToLower());
            if (proj != null) return proj.Id;
            proj = await _db.Projects.AsNoTracking().FirstOrDefaultAsync(x => EF.Functions.Like(x.Name, text + "%"));
            return proj?.Id;
        }

        private async void SetAssignmentButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selected == null)
            {
                MessageBox.Show("Select a worker first.", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var newStart = (AssignFromDate.SelectedDate ?? DateTime.Today).Date;
            DateTime? newEndNullable = AssignToDate.SelectedDate?.Date;
            if (newEndNullable.HasValue && newEndNullable.Value < newStart)
            {
                MessageBox.Show("End date cannot be before start date.", "Workers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var pid = await ResolveProjectIdFromCombo();

            try
            {
                if (_db == null) return;
                var existing = await _db.ProjectWorkers.Where(pw => pw.WorkerId == _selected!.Id).OrderBy(pw => pw.AssignedFrom).ToListAsync();

                // If None selected, end/remove assignments from the given start date forward
                if (pid == null)
                {
                    foreach (var pw in existing)
                    {
                        var s = (pw.AssignedFrom ?? DateTime.MinValue).Date;
                        var end = (pw.AssignedTo ?? DateTime.MaxValue).Date;
                        if (end < newStart) continue; // ends before cut
                        if (s >= newStart)
                        {
                            // assignment fully on/after the cut -> remove
                            _db.ProjectWorkers.Remove(pw);
                        }
                        else
                        {
                            // trim right side to day before cut
                            var newE = newStart.AddDays(-1);
                            if (newE < s) { _db.ProjectWorkers.Remove(pw); }
                            else { pw.AssignedTo = newE; _db.ProjectWorkers.Update(pw); }
                        }
                    }
                    await _db.SaveChangesAsync();
                    await LoadWorkers(); // Use LoadWorkers() to refresh grid
                    MessageBox.Show("Worker removed from project(s) from selected date.", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                // Normalize new interval
                var mergedStart = newStart;
                var mergedEnd = (newEndNullable ?? DateTime.MaxValue).Date;

                // Merge with any existing intervals for the same project that overlap or touch the new interval
                foreach (var pw in existing.Where(x => x.ProjectId == pid.Value).ToList())
                {
                    var s = (pw.AssignedFrom ?? DateTime.MinValue).Date;
                    var end = (pw.AssignedTo ?? DateTime.MaxValue).Date;
                    bool overlapsOrAdjacent = s <= mergedEnd.AddDays(1) && end >= mergedStart.AddDays(-1);
                    if (overlapsOrAdjacent)
                    {
                        // expand merged window
                        if (s < mergedStart) mergedStart = s;
                        if (end > mergedEnd) mergedEnd = end;
                        _db.ProjectWorkers.Remove(pw); // will insert single merged row below
                    }
                }

                // For other projects, remove overlap with [mergedStart, mergedEnd] by trimming or splitting
                foreach (var pw in existing.Where(x => x.ProjectId != pid.Value).ToList())
                {
                    var s = (pw.AssignedFrom ?? DateTime.MinValue).Date;
                    var end = (pw.AssignedTo ?? DateTime.MaxValue).Date;
                    bool intersects = s <= mergedEnd && end >= mergedStart;
                    if (!intersects) continue;

                    // case: fully covered by new interval -> remove
                    if (mergedStart <= s && end <= mergedEnd)
                    {
                        _db.ProjectWorkers.Remove(pw);
                        continue;
                    }

                    // case: overlap in the middle -> split into up to two segments
                    if (s < mergedStart && end > mergedEnd)
                    {
                        // left segment [s, mergedStart-1]
                        var leftEnd = mergedStart.AddDays(-1);
                        // right segment [mergedEnd+1, end]
                        var rightStart = mergedEnd.AddDays(1);

                        // reuse current row for left if valid, else for right
                        bool leftValid = s <= leftEnd;
                        bool rightValid = rightStart <= end;

                        if (leftValid)
                        {
                            pw.AssignedFrom = s;
                            pw.AssignedTo = leftEnd;
                            _db.ProjectWorkers.Update(pw);
                            if (rightValid)
                            {
                                var right = new ProjectWorker
                                {
                                    WorkerId = pw.WorkerId,
                                    ProjectId = pw.ProjectId,
                                    AssignedFrom = rightStart,
                                    AssignedTo = end,
                                    Role = pw.Role,
                                    Notes = pw.Notes
                                };
                                _db.ProjectWorkers.Add(right);
                            }
                        }
                        else if (rightValid)
                        {
                            pw.AssignedFrom = rightStart;
                            pw.AssignedTo = end;
                            _db.ProjectWorkers.Update(pw);
                        }
                        else
                        {
                            _db.ProjectWorkers.Remove(pw);
                        }
                        continue;
                    }

                    // case: overlaps left tail -> trim right to mergedStart-1
                    if (s < mergedStart && end >= mergedStart && end <= mergedEnd)
                    {
                        var newE = mergedStart.AddDays(-1);
                        if (newE < s) _db.ProjectWorkers.Remove(pw);
                        else { pw.AssignedTo = newE; _db.ProjectWorkers.Update(pw); }
                        continue;
                    }

                    // case: overlaps right tail -> trim left to mergedEnd+1
                    if (s >= mergedStart && s <= mergedEnd && end > mergedEnd)
                    {
                        var newS = mergedEnd.AddDays(1);
                        if (newS > end) _db.ProjectWorkers.Remove(pw);
                        else { pw.AssignedFrom = newS; _db.ProjectWorkers.Update(pw); }
                        continue;
                    }
                }

                // Insert merged row for target project
                var toSaveEnd = mergedEnd == DateTime.MaxValue ? (DateTime?)null : mergedEnd;
                var newRow = new ProjectWorker
                {
                    WorkerId = _selected!.Id,
                    ProjectId = pid.Value,
                    AssignedFrom = mergedStart,
                    AssignedTo = toSaveEnd,
                    Role = _selected!.Role,
                    Notes = "Assigned via Set"
                };
                _db.ProjectWorkers.Add(newRow);

                await _db.SaveChangesAsync();

                // Reflect selection by selecting project in combo
                for (int i = 0; i < AssignProjectBox.Items.Count; i++)
                {
                    if (AssignProjectBox.Items[i] is ComboBoxItem cbi && cbi.Tag is int id && id == pid.Value)
                    {
                        AssignProjectBox.SelectedIndex = i;
                        break;
                    }
                }

                // Call LoadWorkers to refresh the grid after changes.
                await LoadWorkers();
                MessageBox.Show("Assignment set.", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Setting assignment failed: {ex.Message}", "Workers", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void MarkAttendance_Click(object sender, RoutedEventArgs e)
        {
            var parent = Window.GetWindow(this) as MainWindow;
            if (parent == null) return;
            var av = new AttendanceView();
            if (_selected != null)
            {
                try
                {
                    await av.SelectWorker(_selected.Id);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to select worker in AttendanceView: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            parent.MainContent.Content = av;
        }

        private async void AddWorker_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_db == null) return;
                var name = WorkerName.Text?.Trim();
                var nic = WorkerNIC.Text?.Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    MessageBox.Show("Worker name is required.", "Workers", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                if (string.IsNullOrWhiteSpace(nic))
                {
                    MessageBox.Show("Worker NIC is required.", "Workers", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var isNew = _selected == null;
                var model = isNew ? new Worker() : _selected!;
                model.FullName = name;
                model.NIC = nic;
                model.Role = (WorkerRole.SelectedItem as ComboBoxItem)?.Content as string ?? string.Empty;
                if (decimal.TryParse(WorkerRate.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var rate)) model.DailyRate = rate; else model.DailyRate = 0;
                model.Phone = WorkerPhone.Text?.Trim() ?? string.Empty;
                model.Phone2 = WorkerPhone2.Text?.Trim() ?? string.Empty;
                model.Status = (WorkerStatus.SelectedItem as ComboBoxItem)?.Content as string ?? string.Empty;
                model.Notes = WorkerNotes.Text?.Trim() ?? string.Empty;

                if (isNew) _db!.Workers.Add(model); else _db!.Workers.Update(model);
                await _db.SaveChangesAsync();

                _selected = null;
                ClearForm();
                await LoadWorkers();
                MessageBox.Show("Worker saved", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Save failed: {ex.Message}");
            }
        }

        private void Clear_Click(object sender, RoutedEventArgs e)
        {
            _selected = null;
            ClearForm();
        }

        private async void Delete_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_db == null) return;
                if (_selected == null)
                {
                    MessageBox.Show("Select a worker to delete.", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                var res = MessageBox.Show($"Are you sure you want to delete worker '{_selected.FullName}'?", "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Warning);
                if (res != MessageBoxResult.Yes) return;

                _db.Workers.Remove(_selected);
                await _db.SaveChangesAsync();
                _selected = null;
                ClearForm();
                await LoadWorkers();
                MessageBox.Show("Worker deleted", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Delete failed: {ex.Message}");
            }
        }

        private void ClearForm()
        {
            try
            {
                WorkerName.Clear();
                WorkerNIC.Clear();
                WorkerRole.SelectedIndex = -1;
                WorkerRate.Clear();
                WorkerPhone.Clear();
                WorkerPhone2.Clear();
                WorkerStatus.SelectedIndex = -1;
                WorkerNotes.Clear();
                WorkersGrid.SelectedItem = null;
                AssignProjectBox.SelectedIndex = 0; // None
                AssignFromDate.SelectedDate = null;
                AssignToDate.SelectedDate = null;
                AssignmentHistoryList.ItemsSource = null;
            }
            catch { }
        }

        private async void RoleFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded) return;
            await LoadWorkers();
        }

        private async void ReconcileButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var monthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
                await AssignmentReconciler.ReconcileMonth(_db, monthStart, _selected?.Id);
                await LoadWorkers(); // Use LoadWorkers() to refresh grid
                MessageBox.Show("Reconciliation complete.", "Workers", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Reconciliation failed: {ex.Message}", "Workers", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
#pragma warning restore CS8602, CS8604
    }
}
