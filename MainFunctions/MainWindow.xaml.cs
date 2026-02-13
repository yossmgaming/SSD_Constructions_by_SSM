using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace MainFunctions
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.DashboardView();
        }

        private void Projects_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.ProjectsView();
        }

        private void Workers_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.WorkersView();
        }

        private void Materials_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.MaterialsView();
        }

        private void Payments_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.PaymentsView();
        }

        private void Reports_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.ReportsView();
        }

        private void BOQGenerator_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.BOQGenerator();
        }

        private void ProjectOverview_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.ProjectFinancialOverviewView();
        }

        private void WorkerPayroll_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.WorkerPayrollView();
        }

        private void MaterialPurchase_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.MaterialPurchaseView();
        }

        private void ClientInvoice_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.ClientInvoiceView();
        }

        private void ProjectExpense_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.ProjectExpenseView();
        }

        private void Advances_Click(object sender, RoutedEventArgs e)
        {
            MainContent.Content = new Views.AdvancesView();
        }
    }
}