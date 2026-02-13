namespace MainFunctions.Models
{
    public enum ObligationDirection
    {
        Receivable = 1,
        Payable = 2
    }

    public enum EntityType
    {
        None = 0,
        Client = 1,
        Worker = 2,
        Supplier = 3
    }

    public enum CashDirection
    {
        In = 1,
        Out = 2
    }

    public enum ObligationStatus
    {
        Pending = 1,
        Partial = 2,
        Paid = 3,
        Overdue = 4
    }

    public enum CashMethod
    {
        Cash = 1,
        Bank = 2,
        Cheque = 3,
        Other = 4
    }
}
