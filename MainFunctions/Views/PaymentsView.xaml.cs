using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace MainFunctions.Views
{
    /// <summary>
    /// Interaction logic for PaymentsView.xaml
    /// </summary>
    public partial class PaymentsView : UserControl
    {
        public PaymentsView()
        {
            InitializeComponent();
        }

        private void AddPayment_Click(object sender, RoutedEventArgs e)
        {
            // TODO: open add payment dialog
        }

        private void Refresh_Click(object sender, RoutedEventArgs e)
        {
            // TODO: refresh payments list
        }
    }
}
