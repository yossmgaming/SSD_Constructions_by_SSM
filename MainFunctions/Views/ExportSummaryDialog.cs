using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using MainFunctions.Services;

namespace MainFunctions.Views
{
    public class ExportSummaryDialog : Window
    {
        public bool IncludeHours { get; private set; } = true;
        public bool IncludeEarnings { get; private set; } = true;

        public ExportSummaryDialog(string projectName, DateTime monthStart, int totalWorkers, int totalAssignedDays, int totalPresentDays, int totalAbsentDays, decimal totalHours, decimal payroll)
        {
            Title = "Export Summary";
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            SizeToContent = SizeToContent.WidthAndHeight;
            ResizeMode = ResizeMode.NoResize;

            var root = new StackPanel { Margin = new Thickness(12) };
            root.Children.Add(new TextBlock { Text = $"Project: {projectName}", FontWeight = System.Windows.FontWeights.SemiBold });
            root.Children.Add(new TextBlock { Text = $"Month: {monthStart:MMMM yyyy}" });
            root.Children.Add(new TextBlock { Text = $"Total Workers: {totalWorkers}" });
            root.Children.Add(new TextBlock { Text = $"Total Assigned Days: {totalAssignedDays}" });
            root.Children.Add(new TextBlock { Text = $"Total Present Days: {totalPresentDays}" });
            root.Children.Add(new TextBlock { Text = $"Total Absent Days: {totalAbsentDays}" });
            root.Children.Add(new TextBlock { Text = $"Total Hours: {totalHours.ToString("0.##", CultureInfo.InvariantCulture)}" });
            root.Children.Add(new TextBlock { Text = $"Payroll Estimate: LKR {payroll.ToString("N2", CultureInfo.CurrentCulture)}" });

            var cbHours = new CheckBox { Content = "Include Hours", IsChecked = true, Margin = new Thickness(0,8,0,0) };
            var cbEarnings = new CheckBox { Content = "Include Earnings", IsChecked = true };
            root.Children.Add(cbHours);
            root.Children.Add(cbEarnings);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0,8,0,0) };
            var ok = new Button { Content = "Export", MinWidth = 90, Margin = new Thickness(0,0,8,0) };
            var cancel = new Button { Content = "Cancel", MinWidth = 80 };
            buttons.Children.Add(ok);
            buttons.Children.Add(cancel);
            root.Children.Add(buttons);

            ok.Click += (s, e) => { IncludeHours = cbHours.IsChecked == true; IncludeEarnings = cbEarnings.IsChecked == true; DialogResult = true; };
            cancel.Click += (s, e) => DialogResult = false;

            Content = root;
        }
    }
}
