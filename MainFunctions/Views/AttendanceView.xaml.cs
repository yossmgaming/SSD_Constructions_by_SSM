#nullable disable

using System;
using System.Collections.Generic;
using System.Globalization;
#pragma warning disable CS8602, CS8604, CS8601, CS8629, CS4014
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using MainFunctions.Data;
using MainFunctions.Models;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    public partial class AttendanceView : UserControl
    {
        private AppDbContext _db = null!; // not readonly to allow refresh
        private DateTime _displayMonth; // SelectedMonth (YYYY-MM)
        private Worker _selectedWorker = null!;
        private List<Attendance> _currentMonthAttendance = new List<Attendance>();

        // New: in-memory indexes for seamless UX (no project selection needed)
        private readonly Dictionary<DateTime, List<int>> _assignmentsByDate = new();
        private readonly Dictionary<DateTime, Dictionary<int, Attendance>> _attendanceByDateProject = new();
        private readonly Dictionary<int, string> _projectNames = new();

        // New: persist custom hours locally (sidecar file) to support hourly exports without DB schema changes
        private Dictionary<string, decimal> _hoursStore = new();
        private string HoursStorePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "MainFunctions", "attendance-hours.json");

        public AttendanceView()
        {
            InitializeComponent();
            _displayMonth = DateTime.Today;
            Loaded += AttendanceView_Loaded;
            IsVisibleChanged += AttendanceView_IsVisibleChanged;
            LoadHoursStore();
            UpdateMonthLabel();
        }

        private void LoadHoursStore()
        {
            try
            {
                var dir = Path.GetDirectoryName(HoursStorePath)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                if (File.Exists(HoursStorePath))
                {
                    var json = File.ReadAllText(HoursStorePath);
                    var dict = JsonSerializer.Deserialize<Dictionary<string, decimal>>(json);
                    _hoursStore = dict ?? new Dictionary<string, decimal>();
                }
            }
            catch
            {
                _hoursStore = new Dictionary<string, decimal>();
            }
        }

        private void SaveHoursStore()
        {
            try
            {
                var dir = Path.GetDirectoryName(HoursStorePath)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                var json = JsonSerializer.Serialize(_hoursStore, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(HoursStorePath, json);
            }
            catch
            {
                // ignore IO errors silently
            }
        }

        private static string BuildHoursKey(int workerId, int? projectId, DateTime date)
            => $"{workerId}|{(projectId ?? 0)}|{date:yyyy-MM-dd}";

        private async void AttendanceView_Loaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            // RefreshDb(); // No longer needed, _db is initialized async
            await LoadProjects();
            await LoadWorkers("");
            if (_selectedWorker != null)
            {
                await LoadAttendanceForSelectedWorker();
            }
            RenderCalendar();
            await UpdateSummaryCounts();
        }

        private async void AttendanceView_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if (IsVisible)
            {
                // RefreshDb(); // Not needed, _db is created via factory as needed
                if (_selectedWorker != null)
                {
                    await LoadAttendanceForSelectedWorker();
                }
                RenderCalendar();
                await UpdateSummaryCounts();
            }
        }



        public async Task SelectWorker(int workerId)
        {
            await LoadWorkers("");
            var item = WorkersListBox.Items.Cast<object>().OfType<Worker>().FirstOrDefault(w => w.Id == workerId);
            if (item != null)
            {
                WorkersListBox.SelectedItem = item;
                _selectedWorker = item;
                // Default to all projects for seamless UX
                if (ProjectFilter.Items.Count > 0) ProjectFilter.SelectedIndex = 0;
                await LoadAttendanceForSelectedWorker();
                RenderCalendar();
                await UpdateSummaryCounts();
            }
            else
            {
                var w = await _db.Workers.AsNoTracking().FirstOrDefaultAsync(wk => wk.Id == workerId);
                if (w != null)
                {
                    WorkersListBox.Items.Add(w);
                    WorkersListBox.SelectedItem = w!;
                    _selectedWorker = w;
                    if (ProjectFilter.Items.Count > 0) ProjectFilter.SelectedIndex = 0;
                    await LoadAttendanceForSelectedWorker();
                    RenderCalendar();
                    await UpdateSummaryCounts();
                }
            }
        }

        private void BackButton_Click(object sender, RoutedEventArgs e)
        {
            var parent = Window.GetWindow(this) as MainWindow;
            if (parent == null) return;
            parent.MainContent.Content = new WorkersView();
        }

        private async Task LoadProjects()
        {
            var list = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).ToListAsync();
            ProjectFilter.Items.Clear();
            ProjectFilter.Items.Add(new ComboBoxItem { Content = "All Projects", Tag = 0 });
            foreach (var p in list)
            {
                ProjectFilter.Items.Add(new ComboBoxItem { Content = p.Name ?? string.Empty, Tag = p.Id });
            }
            if (ProjectFilter.SelectedIndex < 0) ProjectFilter.SelectedIndex = 0;
        }

        private async Task LoadWorkers(string term)
        {
            var q = _db.Workers.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(term))
            {
                term = term.Trim();
                q = q.Where(w => EF.Functions.Like(w.FullName ?? string.Empty, term + "%"));
            }
            WorkersListBox.ItemsSource = await q.OrderBy(w => w.FullName).ToListAsync();
        }

        private async void SearchWorkerBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            await LoadWorkers(SearchWorkerBox.Text?.Trim() ?? string.Empty);
        }

        private async void WorkersListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            _selectedWorker = WorkersListBox.SelectedItem as Worker;
            if (_selectedWorker != null)
            {
                // Load data
                if (ProjectFilter.Items.Count > 0) ProjectFilter.SelectedIndex = 0; // default All Projects
                await LoadAttendanceForSelectedWorker();

                // Auto-select first assigned project in current month (if any)
                var monthStart = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                var dayWithProjects = _assignmentsByDate
                    .Where(kv => kv.Key >= monthStart && kv.Key <= monthEnd && kv.Value.Count > 0)
                    .OrderBy(kv => kv.Key)
                    .Select(kv => kv.Value.First())
                    .FirstOrDefault();
                if (dayWithProjects > 0)
                {
                    for (int i = 0; i < ProjectFilter.Items.Count; i++)
                    {
                        if (ProjectFilter.Items[i] is ComboBoxItem cbi && cbi.Tag is int id && id == dayWithProjects)
                        {
                            ProjectFilter.SelectedIndex = i;
                            break;
                        }
                    }
                }

                RenderCalendar();
            }
            await UpdateSummaryCounts();
        }

        private async void ProjectFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Now acts as an optional filter only; not required to be selected
            if (_selectedWorker != null)
            {
                await LoadAttendanceForSelectedWorker();
                RenderCalendar();
            }
            else
            {
                _currentMonthAttendance.Clear();
                RenderCalendar();
            }
            UpdateSummaryCounts();
        }

        private void UpdateMonthLabel()
        {
            MonthLabel.Text = _displayMonth.ToString("MMMM yyyy");
        }

        private async void PrevMonthButton_Click(object sender, RoutedEventArgs e)
        {
            _displayMonth = _displayMonth.AddMonths(-1);
            UpdateMonthLabel();
            if (_selectedWorker != null) await LoadAttendanceForSelectedWorker();
            RenderCalendar();
            await UpdateSummaryCounts();
        }

        private async void NextMonthButton_Click(object sender, RoutedEventArgs e)
        {
            _displayMonth = _displayMonth.AddMonths(1);
            UpdateMonthLabel();
            if (_selectedWorker != null) await LoadAttendanceForSelectedWorker();
            RenderCalendar();
            await UpdateSummaryCounts();
        }

        private bool IsProjectScopeEnabled()
        {
            var projectId = (ProjectFilter.SelectedItem as ComboBoxItem)?.Tag as int? ?? 0;
            return projectId > 0;
        }

        private bool IsCountedDay(DateTime d) => AttendanceSettings.IsCountedDay(d);

        private void RenderCalendar()
        {
            CalendarGrid.Children.Clear();

            var firstOfMonth = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
            int skipDays = (int)firstOfMonth.DayOfWeek; // Sunday = 0
            int daysInMonth = DateTime.DaysInMonth(_displayMonth.Year, _displayMonth.Month);

            // Fill leading empty cells in first row with a subtle background
            for (int i = 0; i < skipDays; i++)
            {
                CalendarGrid.Children.Add(new Border
                {
                    Background = Brushes.WhiteSmoke,
                    BorderBrush = Brushes.LightGray,
                    BorderThickness = new Thickness(0.5),
                    Margin = new Thickness(2),
                    Padding = new Thickness(6)
                });
            }

            // Hide hint if worker is selected (we auto-handle projects)
            ProjectHintText.Visibility = _selectedWorker == null ? Visibility.Visible : Visibility.Collapsed;

            var allowToggle = IsProjectScopeEnabled();

            for (int day = 1; day <= daysInMonth; day++)
            {
                var date = new DateTime(_displayMonth.Year, _displayMonth.Month, day);

                var border = new Border
                {
                    BorderBrush = Brushes.LightGray,
                    BorderThickness = new Thickness(0.5),
                    Margin = new Thickness(2),
                    Padding = new Thickness(6)
                };

                var stack = new StackPanel();
                var dayText = new TextBlock { Text = day.ToString(), HorizontalAlignment = System.Windows.HorizontalAlignment.Left };
                stack.Children.Add(dayText);

                if (_selectedWorker != null)
                {
                    var assignedProjects = GetAssignedProjectsForDate(date);
                    var assignedCount = assignedProjects.Count;

                    if (assignedCount == 0)
                    {
                        border.Background = Brushes.WhiteSmoke; // non-assigned day still has subtle color
                        border.ToolTip = $"{date:yyyy-MM-dd} - Not assigned";
                    }
                    else if (assignedCount == 1)
                    {
                        var pid = assignedProjects[0];
                        _attendanceByDateProject.TryGetValue(date.Date, out var byProject);
                        Attendance? att = null;
                        if (byProject != null)
                        {
                            byProject.TryGetValue(pid, out att);
                        }

                        if (att != null)
                        {
                            var statusText = att.IsPresent ? "Present" : "Absent";
                            var status = new TextBlock { Text = statusText, HorizontalAlignment = System.Windows.HorizontalAlignment.Right };
                            stack.Children.Add(status);
                            border.Background = att.IsPresent ? Brushes.LightGreen : Brushes.Tomato;
                            var hours = att.HoursWorked > 0 ? att.HoursWorked.ToString("0.##", CultureInfo.InvariantCulture) : (_hoursStore.TryGetValue(BuildHoursKey(att.WorkerId, att.ProjectId, date), out var h) ? h.ToString("0.##", CultureInfo.InvariantCulture) : "-");
                            border.ToolTip = $"{date:yyyy-MM-dd} - {_projectNames.GetValueOrDefault(pid, "Project")} - {statusText} | Hours: {hours} {(allowToggle ? $"(click to {(att.IsPresent ? "mark Absent" : "clear")})" : "(select a project to edit)")}";
                        }
                        else
                        {
                            border.Background = Brushes.LightBlue; // assigned but no record yet
                            var projText = new TextBlock { Text = _projectNames.GetValueOrDefault(pid, "Project"), Foreground = Brushes.Black };
                            stack.Children.Add(projText);
                            border.ToolTip = allowToggle
                                ? $"{date:yyyy-MM-dd} - Assigned to {_projectNames.GetValueOrDefault(pid, "project")} (click to mark Present)"
                                : $"{date:yyyy-MM-dd} - Assigned to {_projectNames.GetValueOrDefault(pid, "project")} (select a project to edit)";
                        }
                    }
                    else
                    {
                        // Multiple assignments
                        border.Background = Brushes.LightBlue;
                        _attendanceByDateProject.TryGetValue(date.Date, out var byProject);
                        int presentCount = byProject == null ? 0 : byProject.Where(kv => assignedProjects.Contains(kv.Key) && kv.Value.IsPresent).Count();
                        var info = new TextBlock { Text = $"Assigned: {assignedCount} | Present: {presentCount}", HorizontalAlignment = System.Windows.HorizontalAlignment.Left };
                        stack.Children.Add(info);
                        border.ToolTip = allowToggle
                            ? $"{date:yyyy-MM-dd} - Multiple assignments ({assignedCount}). Click to choose project to toggle attendance."
                            : $"{date:yyyy-MM-dd} - Multiple assignments ({assignedCount}). Select a project to edit.";
                    }

                    if (allowToggle)
                    {
                        border.MouseLeftButtonUp += (s, e) =>
                        {
                            ToggleAttendanceForDate(date);
                        };

                        // Context menu for Edit hours
                        var ctx = new ContextMenu();
                        var editItem = new MenuItem { Header = "Edit hours..." };
                        editItem.Click += (s, e) =>
                        {
                            EditHoursForDate(date);
                        };
                        ctx.Items.Add(editItem);
                        border.ContextMenu = ctx;
                    }
                }
                else
                {
                    // No worker selected; show subtle background for the day cell
                    border.Background = Brushes.WhiteSmoke;
                    border.ToolTip = $"{date:yyyy-MM-dd} - Select a worker";
                }

                // Weekend overlay (do not overwrite existing color if already set to present/absent/assigned)
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                {
                    // If still default/non-highlight background, tint it slightly
                    if (border.Background == null || border.Background == Brushes.WhiteSmoke || border.Background == Brushes.Transparent)
                    {
                        border.Background = new SolidColorBrush(System.Windows.Media.Color.FromArgb((byte)18, (byte)0, (byte)0, (byte)0));
                    }
                }

                border.Child = stack;
                CalendarGrid.Children.Add(border);
            }

            // Fill trailing empty cells in last row with subtle background
            int usedCells = skipDays + daysInMonth;
            int remainder = usedCells % 7;
            if (remainder != 0)
            {
                int trailing = 7 - remainder;
                for (int i = 0; i < trailing; i++)
                {
                    CalendarGrid.Children.Add(new Border
                    {
                        Background = Brushes.WhiteSmoke,
                        BorderBrush = Brushes.LightGray,
                        BorderThickness = new Thickness(0.5),
                        Margin = new Thickness(2),
                        Padding = new Thickness(6)
                    });
                }
            }
        }

        private async Task LoadAttendanceForSelectedWorker()
        {
            if (_selectedWorker == null)
            {
                _currentMonthAttendance.Clear();
                _assignmentsByDate.Clear();
                _attendanceByDateProject.Clear();
                _projectNames.Clear();
                return;
            }

            var monthStart = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var workerId = _selectedWorker.Id;

            // Optional project filter (still supported)
            var selectedProjectId = (ProjectFilter.SelectedItem as ComboBoxItem)?.Tag as int? ?? 0;

            // Build assignment index for each day of month
            _assignmentsByDate.Clear();
            _projectNames.Clear();

            var rawAssignments = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.WorkerId == workerId &&
                             (pw.AssignedFrom == null || pw.AssignedFrom <= monthEnd) &&
                             (pw.AssignedTo == null || pw.AssignedTo >= monthStart))
                .Select(pw => new { pw.ProjectId, pw.AssignedFrom, pw.AssignedTo })
                .ToListAsync();

            var projectIds = new HashSet<int>();

            foreach (var ra in rawAssignments)
            {
                var start = (ra.AssignedFrom ?? DateTime.MinValue).Date < monthStart ? monthStart : (ra.AssignedFrom ?? DateTime.MinValue).Date;
                var end = (ra.AssignedTo ?? DateTime.MaxValue).Date > monthEnd ? monthEnd : (ra.AssignedTo ?? DateTime.MaxValue).Date;
                if (end < start) continue;
                for (var d = start; d <= end; d = d.AddDays(1))
                {
                    if (!_assignmentsByDate.TryGetValue(d, out var list))
                    {
                        list = new List<int>();
                        _assignmentsByDate[d] = list;
                    }
                    if (ra.ProjectId > 0 && !list.Contains(ra.ProjectId))
                    {
                        list.Add(ra.ProjectId);
                        projectIds.Add(ra.ProjectId);
                    }
                }
            }

            // Load project names for display
            if (projectIds.Count > 0)
            {
                var names = await _db.Projects.AsNoTracking()
                    .Where(p => projectIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.Name })
                    .ToListAsync();
                foreach (var n in names) _projectNames[n.Id] = n.Name;
            }

            // Load attendance for worker within month (all projects)
            _attendanceByDateProject.Clear();
            var attendance = await _db.Attendances.AsNoTracking()
                .Where(a => a.WorkerId == workerId && a.Date >= monthStart && a.Date <= monthEnd)
                .ToListAsync();

            foreach (var a in attendance)
            {
                var keyDate = a.Date.Date;
                if (!_attendanceByDateProject.TryGetValue(keyDate, out var dict))
                {
                    dict = new Dictionary<int, Attendance>();
                    _attendanceByDateProject[keyDate] = dict;
                }
                if (a.ProjectId.HasValue)
                {
                    dict[a.ProjectId.Value] = a;
                }
            }

            // If user picked a specific project filter, trim assignment index for rendering but keep union for summary
            if (selectedProjectId > 0)
            {
                foreach (var k in _assignmentsByDate.Keys.ToList())
                {
                    _assignmentsByDate[k] = _assignmentsByDate[k].Where(id => id == selectedProjectId).ToList();
                }
            }
        }

        private List<int> GetAssignedProjectsForDate(DateTime date)
        {
            var d = date.Date;
            if (_assignmentsByDate.TryGetValue(d, out var list)) return list;
            return new List<int>();
        }

        private int? PromptProjectSelection(DateTime date, List<int> projectIds)
        {
            var owner = Window.GetWindow(this);
            var panel = new StackPanel { Margin = new Thickness(12) };
            panel.Children.Add(new TextBlock { Text = $"Select project for {date:yyyy-MM-dd}", Margin = new Thickness(0, 0, 0, 8) });

            var combo = new ComboBox { MinWidth = 260, Margin = new Thickness(0, 0, 0, 12) };
            foreach (var id in projectIds)
            {
                combo.Items.Add(new ComboBoxItem { Content = _projectNames.GetValueOrDefault(id, $"Project {id}"), Tag = id });
            }
            combo.SelectedIndex = 0;
            panel.Children.Add(combo);

            int? result = null;
            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = System.Windows.HorizontalAlignment.Right };
            var ok = new Button { Content = "OK", MinWidth = 75, Margin = new Thickness(0, 0, 8, 0) };
            var cancel = new Button { Content = "Cancel", MinWidth = 75 };
            buttons.Children.Add(ok);
            buttons.Children.Add(cancel);
            panel.Children.Add(buttons);

            var window = new Window
            {
                Title = "Select Project",
                Owner = owner,
                WindowStartupLocation = WindowStartupLocation.CenterOwner,
                Content = panel,
                SizeToContent = SizeToContent.WidthAndHeight,
                ResizeMode = ResizeMode.NoResize
            };

            ok.Click += (s, e) =>
            {
                if (combo.SelectedItem is ComboBoxItem cbi && cbi.Tag is int id)
                {
                    result = id;
                    window.DialogResult = true;
                }
            };
            cancel.Click += (s, e) => window.DialogResult = false;

            var dlg = window.ShowDialog();
            return dlg == true ? result : null;
        }

        // Prompt for hours entry: Full day (8h), Half day (4h), or Custom hours
        private decimal? PromptHoursForDate(DateTime date)
        {
            var owner = Window.GetWindow(this);
            var window = new Window
            {
                Title = $"Set Hours � {date:yyyy-MM-dd}",
                Owner = owner,
                WindowStartupLocation = WindowStartupLocation.CenterOwner,
                SizeToContent = SizeToContent.WidthAndHeight,
                ResizeMode = ResizeMode.NoResize
            };

            var root = new StackPanel { Margin = new Thickness(12) };
            root.Children.Add(new TextBlock { Text = "Select attendance duration:", Margin = new Thickness(0,0,0,8) });

            var optFull = new RadioButton { Content = "Full day (8 hours)", IsChecked = true, Margin = new Thickness(0,0,0,4) };
            var optHalf = new RadioButton { Content = "Half day (4 hours)", Margin = new Thickness(0,0,0,4) };
            var optCustom = new RadioButton { Content = "Custom hours", Margin = new Thickness(0,0,0,4) };
            root.Children.Add(optFull);
            root.Children.Add(optHalf);
            root.Children.Add(optCustom);

            var customPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(16,4,0,8) };
            customPanel.Children.Add(new TextBlock { Text = "Hours:", VerticalAlignment = System.Windows.VerticalAlignment.Center, Margin = new Thickness(0,0,6,0) });
            var hoursBox = new TextBox { Width = 80 };
            customPanel.Children.Add(hoursBox);
            root.Children.Add(customPanel);

            optCustom.Checked += (s, e) => hoursBox.IsEnabled = true;
            optFull.Checked += (s, e) => { hoursBox.IsEnabled = false; hoursBox.Text = string.Empty; };
            optHalf.Checked += (s, e) => { hoursBox.IsEnabled = false; hoursBox.Text = string.Empty; };
            hoursBox.IsEnabled = false;

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = System.Windows.HorizontalAlignment.Right };
            var ok = new Button { Content = "OK", MinWidth = 75, Margin = new Thickness(0,0,8,0) };
            var cancel = new Button { Content = "Cancel", MinWidth = 75 };
            buttons.Children.Add(ok);
            buttons.Children.Add(cancel);
            root.Children.Add(buttons);

            window.Content = root;

            decimal? result = null;
            ok.Click += (s, e) =>
            {
                if (optFull.IsChecked == true) result = 8m;
                else if (optHalf.IsChecked == true) result = 4m;
                else if (optCustom.IsChecked == true)
                {
                    if (decimal.TryParse(hoursBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var h) && h >= 0m)
                        result = h;
                    else
                    {
                        MessageBox.Show("Enter a valid non-negative number of hours.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Warning);
                        return;
                    }
                }
                window.DialogResult = true;
            };
            cancel.Click += (s, e) => window.DialogResult = false;

            var dlg = window.ShowDialog();
            return dlg == true ? result : null;
        }

        // Helper: apply background by status color for PDF cells
        private static void ApplyStatusCell(IContainer container, string text, string status)
        {
            var bg = status switch
            {
                "Assigned" => QuestPDF.Helpers.Colors.Blue.Lighten4,
                "Present" => QuestPDF.Helpers.Colors.Green.Lighten4,
                "Absent" => QuestPDF.Helpers.Colors.Red.Lighten4,
                _ => QuestPDF.Helpers.Colors.White
            };
            container.Background(bg).Padding(4).Text(text);
        }

        private async void ToggleAttendanceForDate(DateTime date)
        {
            if (_selectedWorker == null) return;

            var assignedProjects = GetAssignedProjectsForDate(date);
            if (assignedProjects.Count == 0)
            {
                MessageBox.Show("Worker is not assigned on this date.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var projectId = assignedProjects.Count == 1 ? assignedProjects[0] : PromptProjectSelection(date, assignedProjects);
            if (projectId == null) return;

            var pid = projectId.Value;
            var existing = await _db.Attendances.FirstOrDefaultAsync(a => a.WorkerId == _selectedWorker.Id && a.ProjectId == pid && a.Date.Date == date.Date);

            if (existing == null)
            {
                var hours = PromptHoursForDate(date);
                if (hours == null) return;
                var capped = Math.Min(hours.Value, 8m);
                var a = new Attendance { WorkerId = _selectedWorker.Id, ProjectId = pid, Date = date.Date, IsPresent = true, HoursWorked = capped, IsHalfDay = capped <= 4m };
                _db.Attendances.Add(a);

                // Sidecar legacy fallback store (best-effort)
                _hoursStore[BuildHoursKey(_selectedWorker.Id, pid, date.Date)] = capped;
                SaveHoursStore();
            }
            else if (existing.IsPresent)
            {
                existing.IsPresent = false;
                existing.HoursWorked = 0m;
                existing.IsHalfDay = false;
                _db.Attendances.Update(existing);

                _hoursStore.Remove(BuildHoursKey(existing.WorkerId, existing.ProjectId, existing.Date.Date));
                SaveHoursStore();
            }
            else
            {
                // Remove record entirely
                _hoursStore.Remove(BuildHoursKey(existing.WorkerId, existing.ProjectId, existing.Date.Date));
                SaveHoursStore();
                _db.Attendances.Remove(existing);
            }

            await _db.SaveChangesAsync();

            await LoadAttendanceForSelectedWorker();
            RenderCalendar();
            await UpdateSummaryCounts();
        }

        private async void EditHoursForDate(DateTime date)
        {
            if (_selectedWorker == null)
            {
                MessageBox.Show("Select a worker first.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var assignedProjects = GetAssignedProjectsForDate(date);
            if (assignedProjects.Count == 0)
            {
                MessageBox.Show("Worker is not assigned on this date.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            int? projectId = assignedProjects.Count == 1 ? assignedProjects[0] : PromptProjectSelection(date, assignedProjects);
            if (projectId == null) return;

            var pid = projectId.Value;
            var hours = PromptHoursForDate(date);
            if (hours == null) return;

            var capped = Math.Min(hours.Value, 8m);
            var existing = await _db.Attendances.FirstOrDefaultAsync(a => a.WorkerId == _selectedWorker.Id && a.ProjectId == pid && a.Date.Date == date.Date);
            if (capped <= 0m)
            {
                if (existing != null)
                {
                    existing.IsPresent = false;
                    existing.HoursWorked = 0m;
                    existing.IsHalfDay = false;
                    _db.Attendances.Update(existing);
                }
                _hoursStore.Remove(BuildHoursKey(_selectedWorker.Id, pid, date.Date));
                SaveHoursStore();
            }
            else
            {
                if (existing == null)
                {
                    existing = new Attendance { WorkerId = _selectedWorker.Id, ProjectId = pid, Date = date.Date, IsPresent = true };
                    _db.Attendances.Add(existing);
                }
                existing.IsPresent = true;
                existing.HoursWorked = capped;
                existing.IsHalfDay = capped <= 4m;
                _db.Attendances.Update(existing);

                _hoursStore[BuildHoursKey(_selectedWorker.Id, pid, date.Date)] = capped;
                SaveHoursStore();
            }

            await _db.SaveChangesAsync();

            await LoadAttendanceForSelectedWorker();
            RenderCalendar();
            await UpdateSummaryCounts();
        }

        // Compute hours and earnings with half-day / hourly support when available, reading sidecar store first
        private (decimal totalHours, decimal totalEarned) ComputeHoursAndEarnings(IEnumerable<Attendance> workerAttendanceForMonth, decimal dailyRate, int workerId, int? projectId, HashSet<DateTime> allowedDates)
        {
            var hourlyRate = dailyRate / 8m;
            var byDate = workerAttendanceForMonth
                .GroupBy(a => a.Date.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            decimal totalHours = 0m;
            foreach (var kv in byDate)
            {
                var date = kv.Key;
                if (!allowedDates.Contains(date)) continue; // skip dates outside assignment

                decimal hoursThisDate = 0m;

                // Prefer DB HoursWorked if present on any present record for this date
                var presentRecords = kv.Value.Where(x => x.IsPresent).ToList();
                if (presentRecords.Count > 0)
                {
                    foreach (var a in presentRecords)
                    {
                        if (a.HoursWorked > 0m)
                        {
                            hoursThisDate += a.HoursWorked;
                        }
                        else
                        {
                            // fallback: half-day flag
                            hoursThisDate += a.IsHalfDay ? 4m : 8m;
                        }
                    }
                }

                // Fallback to sidecar only if DB gave 0
                if (hoursThisDate <= 0m)
                {
                    if (_hoursStore.TryGetValue(BuildHoursKey(workerId, projectId, date), out var stored))
                        hoursThisDate = Math.Max(0m, Math.Min(8m, stored));
                }

                if (hoursThisDate > 8m) hoursThisDate = 8m; // cap per day
                totalHours += hoursThisDate;
            }

            var totalEarned = totalHours * hourlyRate;
            return (totalHours, totalEarned);
        }

        private async Task ExportAttendance()
        {
            var projectId = (ProjectFilter.SelectedItem as ComboBoxItem)?.Tag as int? ?? 0;
            if (projectId <= 0)
            {
                MessageBox.Show("Select a project to export.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            QuestPDF.Settings.License = LicenseType.Community;

            var project = await _db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId);
            var monthStart = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var assignedWorkers = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.ProjectId == projectId &&
                             ((pw.AssignedFrom == null || pw.AssignedFrom <= monthEnd) &&
                              (pw.AssignedTo == null || pw.AssignedTo >= monthStart)))
                .Select(pw => pw.WorkerId)
                .Distinct()
                .ToListAsync();

            var workerIntervals = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.ProjectId == projectId && assignedWorkers.Contains(pw.WorkerId))
                .Select(pw => new
                {
                    pw.WorkerId,
                    Start = (pw.AssignedFrom ?? DateTime.MinValue).Date,
                    End = (pw.AssignedTo ?? DateTime.MaxValue).Date
                })
                .ToListAsync();

            var intervalsByWorker = workerIntervals
                .GroupBy(x => x.WorkerId)
                .ToDictionary(g => g.Key, g => g
                    .Select(x => new
                    {
                        Start = x.Start < monthStart ? monthStart : x.Start,
                        End = x.End > monthEnd ? monthEnd : x.End
                    })
                    .Where(x => x.End >= x.Start)
                    .OrderBy(x => x.Start)
                    .ToList());

            var mergedIntervalsByWorker = new Dictionary<int, List<(DateTime start, DateTime end)>>();
            foreach (var kv in intervalsByWorker)
            {
                var merged = new List<(DateTime start, DateTime end)>();
                foreach (var it in kv.Value)
                {
                    if (merged.Count == 0) merged.Add((it.Start, it.End));
                    else
                    {
                        var last = merged[^1];
                        if (it.Start <= last.end.AddDays(1))
                        {
                            var newEnd = it.End > last.end ? it.End : last.end;
                            merged[^1] = (last.start, newEnd);
                        }
                        else merged.Add((it.Start, it.End));
                    }
                }
                mergedIntervalsByWorker[kv.Key] = merged;
            }

            var attendance = await _db.Attendances.AsNoTracking()
                .Where(a => a.ProjectId == projectId && a.Date >= monthStart && a.Date <= monthEnd)
                .ToListAsync();

            var workers = await _db.Workers.AsNoTracking()
                .Where(w => assignedWorkers.Contains(w.Id))
                .Select(w => new { w.Id, w.FullName, w.DailyRate })
                .ToListAsync();

            var presentDatesByWorker = attendance
                .Where(a => a.IsPresent)
                .GroupBy(a => a.WorkerId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Date.Date).Distinct().ToHashSet());

            var rows = new List<(string name, int assignedDays, int presentDays, int absentDays, decimal rate, decimal earned, decimal ratio, decimal hours)>();
            foreach (var w in workers)
            {
                var merged = mergedIntervalsByWorker.GetValueOrDefault(w.Id) ?? new List<(DateTime start, DateTime end)>();
                int assignedDays = 0;
                var allowedDates = new HashSet<DateTime>();
                foreach (var m in merged)
                {
                    for (var d = m.start.Date; d <= m.end.Date; d = d.AddDays(1))
                    {
                        if (AttendanceSettings.IsCountedDay(d))
                        {
                            allowedDates.Add(d);
                            assignedDays++;
                        }
                    }
                }

                var workerMonthAttendance = attendance.Where(a => a.WorkerId == w.Id).ToList();
                var presentUniqueDates = presentDatesByWorker.GetValueOrDefault(w.Id) ?? new HashSet<DateTime>();
                int presentDays = 0;
                foreach (var d in presentUniqueDates)
                    if (allowedDates.Contains(d)) presentDays++;
                int absentDays = Math.Max(assignedDays - presentDays, 0);

                var (hours, earned) = ComputeHoursAndEarnings(workerMonthAttendance, w.DailyRate, w.Id, projectId, allowedDates);
                decimal ratio = assignedDays > 0 ? (decimal)presentDays / assignedDays : 0m;

                rows.Add((w.FullName, assignedDays, presentDays, absentDays, w.DailyRate, earned, ratio, hours));
            }

            int totalWorkersAssigned = workers.Count;
            int totalPresentDaysAll = rows.Sum(r => r.presentDays);
            int totalAbsentDaysAll = rows.Sum(r => r.absentDays);
            decimal totalPayrollEstimate = rows.Sum(r => r.earned);
            decimal totalHoursAll = rows.Sum(r => r.hours);
            int totalAssignedDaysAll = rows.Sum(r => r.assignedDays);

            var dlg = new ExportSummaryDialog(project.Name ?? string.Empty, monthStart, totalWorkersAssigned, totalAssignedDaysAll, totalPresentDaysAll, totalAbsentDaysAll, totalHoursAll, totalPayrollEstimate)
            {
                Owner = Window.GetWindow(this)
            };
            if (dlg.ShowDialog() != true) return;

            bool includeHours = dlg.IncludeHours;
            bool includeEarnings = dlg.IncludeEarnings;

            try
            {
                var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "AttendanceExports");
                Directory.CreateDirectory(dir);
                var filename = $"Attendance_{project.Name}_{monthStart:yyyy-MM}.pdf";
                var path = Path.Combine(dir, filename);

                Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Margin(20);
                        page.Size(PageSizes.A4);
                        page.DefaultTextStyle(x => x.FontSize(10));

                        page.Header().Column(header =>
                        {
                            header.Item().Text($"Attendance Report � {project.Name} ({monthStart:MMMM yyyy})").SemiBold().FontSize(16);
                            header.Item().Text($"Range: {monthStart:yyyy-MM-01} ? {monthEnd:yyyy-MM-dd}");
                            header.Item().Text($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}");
                            header.Item().Text("Legend: Assigned=Blue, Present=Green, Absent=Red");
                        });

                        page.Content().PaddingVertical(8).Column(col =>
                        {
                            col.Item().PaddingBottom(6).Text(text =>
                            {
                                text.Line($"Total Workers Assigned: {totalWorkersAssigned}");
                                text.Line($"Total Assigned Days (All Workers): {totalAssignedDaysAll}");
                                text.Line($"Total Present Days (All Workers): {totalPresentDaysAll}");
                                text.Line($"Total Absent Days (All Workers): {totalAbsentDaysAll}");
                                text.Line($"Total Hours (All Workers): {totalHoursAll.ToString("0.##", CultureInfo.InvariantCulture)}");
                                text.Line($"Project Payroll Estimate: LKR {totalPayrollEstimate.ToString("N2", CultureInfo.CurrentCulture)}");
                            });

                            col.Item().PaddingTop(6).Text("Per-Worker Details").SemiBold();
                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(3);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1.2f);
                                    if (includeEarnings) columns.RelativeColumn(1.4f);
                                    columns.RelativeColumn(1);
                                    if (includeHours) columns.RelativeColumn(1);
                                    columns.RelativeColumn(2);
                                });

                                table.Header(header =>
                                {
                                    header.Cell().Element(CellHeader).Text("Worker Name");
                                    header.Cell().Element(CellHeader).Text("Assigned Days");
                                    header.Cell().Element(CellHeader).Text("Present Days");
                                    header.Cell().Element(CellHeader).Text("Absent Days");
                                    header.Cell().Element(CellHeader).Text("Daily Rate");
                                    if (includeEarnings) header.Cell().Element(CellHeader).Text("Total Earned");
                                    header.Cell().Element(CellHeader).Text("Attendance %");
                                    if (includeHours) header.Cell().Element(CellHeader).Text("Hours");
                                    header.Cell().Element(CellHeader).Text("Notes");
                                });

                                foreach (var r in rows.OrderBy(x => x.name))
                                {
                                    table.Cell().Element(Cell).Text(r.name);
                                    table.Cell().Element(c => ApplyStatusCell(c, r.assignedDays.ToString(), "Assigned"));
                                    table.Cell().Element(c => ApplyStatusCell(c, r.presentDays.ToString(), "Present"));
                                    table.Cell().Element(c => ApplyStatusCell(c, r.absentDays.ToString(), "Absent"));
                                    table.Cell().Element(CellRight).Text($"LKR {r.rate.ToString("N2", CultureInfo.CurrentCulture)}");
                                    if (includeEarnings) table.Cell().Element(CellRight).Text($"LKR {r.earned.ToString("N2", CultureInfo.CurrentCulture)}");
                                    table.Cell().Element(CellRight).Text($"{(r.ratio * 100m).ToString("0.##", CultureInfo.InvariantCulture)} %");
                                    if (includeHours) table.Cell().Element(CellRight).Text(r.hours.ToString("0.##", CultureInfo.InvariantCulture));
                                    table.Cell().Element(Cell).Text("");
                                }

                                static IContainer CellHeader(IContainer container)
                                    => container.DefaultTextStyle(x => x.SemiBold()).Padding(4).Background(QuestPDF.Helpers.Colors.Grey.Lighten3);
                                static IContainer Cell(IContainer container)
                                    => container.Padding(4);
                                static IContainer CellRight(IContainer container)
                                    => container.Padding(4).AlignRight();
                            });
                        });

                        page.Footer().AlignRight().Text(x =>
                        {
                            x.Span("Page ");
                            x.CurrentPageNumber();
                            x.Span(" of ");
                            x.TotalPages();
                        });
                    });
                }).GeneratePdf(path);

                MessageBox.Show($"PDF exported:\n{path}", "Attendance Export", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to generate PDF: {ex.Message}", "Attendance Export", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // CSV export with settings-aware assigned days and hours
        private async Task ExportAttendanceCsv()
        {
            var projectId = (ProjectFilter.SelectedItem as ComboBoxItem)?.Tag as int? ?? 0;
            if (projectId <= 0)
            {
                MessageBox.Show("Select a project to export.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var project = await _db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId);
            var monthStart = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var assignedWorkers = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.ProjectId == projectId &&
                             ((pw.AssignedFrom == null || pw.AssignedFrom <= monthEnd) &&
                              (pw.AssignedTo == null || pw.AssignedTo >= monthStart)))
                .Select(pw => pw.WorkerId)
                .Distinct()
                .ToListAsync();

            var workerIntervals = await _db.ProjectWorkers.AsNoTracking()
                .Where(pw => pw.ProjectId == projectId && assignedWorkers.Contains(pw.WorkerId))
                .Select(pw => new
                {
                    pw.WorkerId,
                    Start = (pw.AssignedFrom ?? DateTime.MinValue).Date,
                    End = (pw.AssignedTo ?? DateTime.MaxValue).Date
                })
                .ToListAsync();

            var intervalsByWorker = workerIntervals
                .GroupBy(x => x.WorkerId)
                .ToDictionary(g => g.Key, g => g
                    .Select(x => new
                    {
                        Start = x.Start < monthStart ? monthStart : x.Start,
                        End = x.End > monthEnd ? monthEnd : x.End
                    })
                    .Where(x => x.End >= x.Start)
                    .OrderBy(x => x.Start)
                    .ToList());

            var mergedIntervalsByWorker = new Dictionary<int, List<(DateTime start, DateTime end)>>();
            foreach (var kv in intervalsByWorker)
            {
                var merged = new List<(DateTime start, DateTime end)>();
                foreach (var it in kv.Value)
                {
                    if (merged.Count == 0) merged.Add((it.Start, it.End));
                    else
                    {
                        var last = merged[^1];
                        if (it.Start <= last.end.AddDays(1))
                        {
                            var newEnd = it.End > last.end ? it.End : last.end;
                            merged[^1] = (last.start, newEnd);
                        }
                        else merged.Add((it.Start, it.End));
                    }
                }
                mergedIntervalsByWorker[kv.Key] = merged;
            }

            var attendance = await _db.Attendances.AsNoTracking()
                .Where(a => a.ProjectId == projectId && a.Date >= monthStart && a.Date <= monthEnd)
                .ToListAsync();

            var workers = await _db.Workers.AsNoTracking()
                .Where(w => assignedWorkers.Contains(w.Id))
                .Select(w => new { w.Id, w.FullName, w.DailyRate })
                .ToListAsync();

            var presentDatesByWorker = attendance
                .Where(a => a.IsPresent)
                .GroupBy(a => a.WorkerId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Date.Date).Distinct().ToHashSet());

            var rows = new List<(string name, int assignedDays, int presentDays, int absentDays, decimal rate, decimal earned, decimal ratio, decimal hours)>();
            foreach (var w in workers)
            {
                var merged = mergedIntervalsByWorker.GetValueOrDefault(w.Id) ?? new List<(DateTime start, DateTime end)>();
                int assignedDays = 0;
                var allowedDates = new HashSet<DateTime>();
                foreach (var m in merged)
                {
                    for (var d = m.start.Date; d <= m.end.Date; d = d.AddDays(1))
                    {
                        if (AttendanceSettings.IsCountedDay(d))
                        {
                            allowedDates.Add(d);
                            assignedDays++;
                        }
                    }
                }

                var workerMonthAttendance = attendance.Where(a => a.WorkerId == w.Id).ToList();
                var presentUniqueDates = presentDatesByWorker.GetValueOrDefault(w.Id) ?? new HashSet<DateTime>();
                int presentDays = 0;
                foreach (var d in presentUniqueDates)
                    if (allowedDates.Contains(d)) presentDays++;
                int absentDays = Math.Max(assignedDays - presentDays, 0);

                var (hours, earned) = ComputeHoursAndEarnings(workerMonthAttendance, w.DailyRate, w.Id, projectId, allowedDates);
                decimal ratio = assignedDays > 0 ? (decimal)presentDays / assignedDays : 0m;

                rows.Add((w.FullName, assignedDays, presentDays, absentDays, w.DailyRate, earned, ratio, hours));
            }

            int totalWorkersAssigned = workers.Count;
            int totalPresentDaysAll = rows.Sum(r => r.presentDays);
            int totalAbsentDaysAll = rows.Sum(r => r.absentDays);
            decimal totalPayrollEstimate = rows.Sum(r => r.earned);
            decimal totalHoursAll = rows.Sum(r => r.hours);
            int totalAssignedDaysAll = rows.Sum(r => r.assignedDays);

            try
            {
                var sfd = new Microsoft.Win32.SaveFileDialog
                {
                    Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*",
                    FileName = ($"Attendance_{project.Name}_{monthStart:yyyy-MM}").Replace(' ', '_') + ".csv"
                };
                if (sfd.ShowDialog() == true)
                {
                    using var sw = new StreamWriter(sfd.FileName, false, new System.Text.UTF8Encoding(true));
                    sw.WriteLine($"Attendance Report � {project.Name} ({monthStart:MMMM yyyy})");
                    sw.WriteLine($"Range: {monthStart:yyyy-MM-01} -> {monthEnd:yyyy-MM-dd}");
                    sw.WriteLine($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}");
                    sw.WriteLine();

                    sw.WriteLine("Summary");
                    sw.WriteLine($"Total Workers Assigned,{totalWorkersAssigned}");
                    sw.WriteLine($"Total Assigned Days (All Workers),{totalAssignedDaysAll}");
                    sw.WriteLine($"Total Present Days (All Workers),{totalPresentDaysAll}");
                    sw.WriteLine($"Total Absent Days (All Workers),{totalAbsentDaysAll}");
                    sw.WriteLine($"Total Hours (All Workers),{totalHoursAll.ToString("0.##", CultureInfo.InvariantCulture)}");
                    sw.WriteLine($"Project Payroll Estimate,LKR {totalPayrollEstimate.ToString("N2", CultureInfo.CurrentCulture)}");
                    sw.WriteLine();

                    sw.WriteLine("Worker Name,Assigned Days,Present Days,Absent Days,Daily Rate,Total Earned,Attendance %,Hours");
                    foreach (var r in rows.OrderBy(x => x.name))
                    {
                        sw.WriteLine(string.Join(',', new[]
                        {
                            CsvEscape(r.name),
                            r.assignedDays.ToString(CultureInfo.InvariantCulture),
                            r.presentDays.ToString(CultureInfo.InvariantCulture),
                            r.absentDays.ToString(CultureInfo.InvariantCulture),
                            ($"LKR {r.rate.ToString("N2", CultureInfo.CurrentCulture)}"),
                            ($"LKR {r.earned.ToString("N2", CultureInfo.CurrentCulture)}"),
                            ($"{(r.ratio * 100m).ToString("0.##", CultureInfo.InvariantCulture)} %"),
                            r.hours.ToString("0.##", CultureInfo.InvariantCulture)
                        }));
                    }

                    MessageBox.Show("Attendance exported to CSV.", "Attendance", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Export failed: {ex.Message}", "Attendance", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private static string CsvEscape(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var v = value.Replace("\"", "\"\"");
            if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
                return $"\"{v}\"";
            return v;
        }

        private async void ExportMonthlyButton_Click(object sender, RoutedEventArgs e)
        {
            await ExportAttendance();
        }

        private async void ExportCsvButton_Click(object sender, RoutedEventArgs e)
        {
            await ExportAttendanceCsv();
        }

        private async Task UpdateSummaryCounts()
        {
            var projectId = (ProjectFilter.SelectedItem as ComboBoxItem)?.Tag as int? ?? 0;
            var monthStart = new DateTime(_displayMonth.Year, _displayMonth.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            if (_selectedWorker != null)
            {
                var assignedDates = _assignmentsByDate
                    .Where(kv => kv.Key >= monthStart && kv.Key <= monthEnd && kv.Value.Count > 0 && AttendanceSettings.IsCountedDay(kv.Key))
                    .Select(kv => kv.Key)
                    .OrderBy(d => d)
                    .ToList();

                int assignedDays = assignedDates.Count;
                int presentDays = 0;
                foreach (var d in assignedDates)
                {
                    if (_attendanceByDateProject.TryGetValue(d, out var byProject) && byProject.Values.Any(a => a.IsPresent))
                        presentDays++;
                }
                int absentDays = Math.Max(assignedDays - presentDays, 0);

                DateTime? assignedFrom = assignedDates.Count > 0 ? assignedDates.First() : null;
                DateTime? assignedTo = assignedDates.Count > 0 ? assignedDates.Last() : null;

                var assignedFromText = assignedFrom?.ToString("dd, MMMM, yyyy", CultureInfo.InvariantCulture) ?? "N/A";
                var assignedToText = assignedTo?.ToString("dd, MMMM, yyyy", CultureInfo.InvariantCulture) ?? "N/A";

                SummaryModeText.Text = $"{_selectedWorker.FullName}, {monthStart:MMMM yyyy}, assigned from {assignedFromText} to {assignedToText}";
                PresentLabelText.Text = "  |  Present (days):";
                AbsentLabelText.Text = "  |  Absent (days):";

                AssignedCountText.Text = assignedDays.ToString(CultureInfo.InvariantCulture);
                PresentCountText.Text = presentDays.ToString(CultureInfo.InvariantCulture);
                AbsentCountText.Text = absentDays.ToString(CultureInfo.InvariantCulture);

                AssignedCountText.ToolTip = "Days in month where worker is assigned (respects weekend/holiday settings).";
                PresentCountText.ToolTip = "Days with at least one present record on any assigned project.";
                AbsentCountText.ToolTip = "Assigned days minus present days.";
            }
            else
            {
                if (projectId <= 0)
                {
                    SummaryModeText.Text = "";
                    AssignedCountText.Text = "-";
                    PresentLabelText.Text = "  |  Present (days):";
                    PresentCountText.Text = "-";
                    AbsentLabelText.Text = "  |  Absent (days):";
                    AbsentCountText.Text = "-";
                    return;
                }

                var assignedWorkersCount = await _db.ProjectWorkers.AsNoTracking()
                    .CountAsync(pw => pw.ProjectId == projectId &&
                                 ((pw.AssignedFrom == null || pw.AssignedFrom <= monthEnd) &&
                                  (pw.AssignedTo == null || pw.AssignedTo >= monthStart)));

                var presentDays = await _db.Attendances.AsNoTracking()
                    .CountAsync(a => a.ProjectId == projectId && a.Date >= monthStart && a.Date <= monthEnd && a.IsPresent);

                SummaryModeText.Text = $"Project totals | {monthStart:MMMM yyyy} (Absent days shown only in worker view)";
                PresentLabelText.Text = "  |  Present:";
                AbsentLabelText.Text = "  |  Absent:";

                AssignedCountText.Text = assignedWorkersCount.ToString(CultureInfo.InvariantCulture);
                PresentCountText.Text = presentDays.ToString(CultureInfo.InvariantCulture);
                AbsentCountText.Text = "�";

                AssignedCountText.ToolTip = "Count of worker assignments overlapping the month.";
                PresentCountText.ToolTip = "Total present attendance records in the month.";
            }
        }
#pragma warning restore CS8602, CS8604, CS8601, CS8629, CS4014
    }
}
