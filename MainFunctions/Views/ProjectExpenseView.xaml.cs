using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.EntityFrameworkCore;
using MainFunctions.Data;
using MainFunctions.Models;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    public partial class ProjectExpenseView : UserControl
    {
        private AppDbContext? _db;

        public ProjectExpenseView()
        {
            InitializeComponent();
            Loaded += OnLoaded;
            CreateHeaderButton.Click += OnCreate;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _db = await new DbContextFactory().CreateDbContextAsync();
            try { await DbPatcher.EnsureObligationSchema(_db); } catch { }
            var projects = await _db.Projects.AsNoTracking().OrderBy(p => p.Name).Select(p => new { p.Id, p.Name }).ToListAsync();
            ProjectCombo.ItemsSource = projects;
            ProjectCombo.DisplayMemberPath = "Name";
            ProjectCombo.SelectedValuePath = "Id";

            CategoryCombo.ItemsSource = new[] { "Fuel", "Transport", "Permits", "Misc" };
        }

        private async void OnCreate(object sender, RoutedEventArgs e)
        {
            try
            {
                var projectId = ProjectCombo.SelectedValue as int?;
                var category = CategoryCombo.SelectedItem as string;
                var date = DatePicker.SelectedDate ?? DateTime.Today;
                var due = DueDatePicker.SelectedDate;
                if (!projectId.HasValue || string.IsNullOrWhiteSpace(category) || string.IsNullOrWhiteSpace(DescriptionBox.Text))
                {
                    MessageBox.Show("Fill all fields.");
                    return;
                }

                if (!decimal.TryParse(AmountBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0m)
                {
                    MessageBox.Show("Enter a valid amount.");
                    return;
                }

                await using var tx = await _db.Database.BeginTransactionAsync();

                var header = new ObligationHeader
                {
                    Type = "ProjectExpense",
                    Direction = ObligationDirection.Payable,
                    EntityType = EntityType.None,
                    EntityId = null,
                    ProjectId = projectId.Value,
                    PeriodStart = date.Date,
                    PeriodEnd = date.Date,
                    Notes = category,
                    DueDate = due,
                    Status = ObligationStatus.Pending,
                    IsLocked = false
                };

                header.Lines.Add(new ObligationLine
                {
                    Description = DescriptionBox.Text.Trim(),
                    Quantity = 1m,
                    UnitRate = amount,
                    Amount = amount
                });

                header.TotalAmountSnapshot = amount;
                header.Status = ObligationHeader.ComputeStatus(DateTime.Today, header.DueDate, header.TotalAmountSnapshot, 0m);
                header.IsLocked = header.Status == ObligationStatus.Paid;

                _db.ObligationHeaders.Add(header);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                MessageBox.Show("Expense recorded.");
                DescriptionBox.Text = string.Empty;
                AmountBox.Text = string.Empty;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to record expense: {ex.Message}");
            }
        }
    }
}
