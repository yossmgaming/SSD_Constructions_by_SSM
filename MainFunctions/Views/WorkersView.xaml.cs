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
    /// Interaction logic for WorkersView.xaml
    /// </summary>
    public partial class WorkersView : UserControl
    {
        public WorkersView()
        {
            InitializeComponent();
        }

        private void AddWorker_Click(object sender, RoutedEventArgs e)
        {
            // TODO: open add worker dialog
        }

        private void RoleFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {

        }
    }
}
