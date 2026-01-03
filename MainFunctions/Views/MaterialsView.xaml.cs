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
    /// Interaction logic for MaterialsView.xaml
    /// </summary>
    public partial class MaterialsView : UserControl
    {
        public MaterialsView()
        {
            InitializeComponent();
        }

        private void AddMaterial_Click(object sender, RoutedEventArgs e)
        {
            // TODO: open add material dialog or navigate to add form
        }

        private void Refresh_Click(object sender, RoutedEventArgs e)
        {
            // TODO: refresh materials list
        }
    }
}
