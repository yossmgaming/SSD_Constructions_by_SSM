using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;

namespace MainFunctions.ViewModels
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private object? _currentView;
        public object? CurrentView
        {
            get => _currentView;
            set { _currentView = value; OnPropertyChanged(); }
        }

        public ICommand ShowWorkerPayroll { get; }
        public ICommand ShowMaterialPurchase { get; }
        public ICommand ShowClientInvoice { get; }
        public ICommand ShowProjectExpense { get; }
        public ICommand ShowProjectOverview { get; }

        public MainViewModel()
        {
            ShowWorkerPayroll = new RelayCommand(_ => CurrentView = new WorkerPayrollViewModel());
            ShowMaterialPurchase = new RelayCommand(_ => CurrentView = new MaterialPurchaseViewModel());
            ShowClientInvoice = new RelayCommand(_ => CurrentView = new ClientInvoiceViewModel());
            ShowProjectExpense = new RelayCommand(_ => CurrentView = new ProjectExpenseViewModel());
            ShowProjectOverview = new RelayCommand(_ => CurrentView = new ProjectFinancialOverviewViewModel());

            CurrentView = new ProjectFinancialOverviewViewModel();
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }

    public sealed class RelayCommand : ICommand
    {
        private readonly Action<object?> _execute;
        private readonly Func<object?, bool>? _canExecute;
        public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
        {
            _execute = execute; _canExecute = canExecute;
        }
        public bool CanExecute(object? parameter) => _canExecute?.Invoke(parameter) ?? true;
        public void Execute(object? parameter) => _execute(parameter);
        public event EventHandler? CanExecuteChanged;
        public void RaiseCanExecuteChanged() => CanExecuteChanged?.Invoke(this, EventArgs.Empty);
    }

    public class WorkerPayrollViewModel { }
    public class MaterialPurchaseViewModel { }
    public class ClientInvoiceViewModel { }
    public class ProjectExpenseViewModel { }
    public class ProjectFinancialOverviewViewModel { }
}
