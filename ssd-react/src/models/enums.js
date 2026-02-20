export const ObligationDirection = {
  Receivable: 'Receivable',
  Payable: 'Payable',
};

export const EntityType = {
  None: 'None',
  Client: 'Client',
  Worker: 'Worker',
  Supplier: 'Supplier',
};

export const CashDirection = {
  In: 'In',
  Out: 'Out',
};

export const ObligationStatus = {
  Pending: 'Pending',
  Partial: 'Partial',
  Paid: 'Paid',
  Overdue: 'Overdue',
};

export const CashMethod = {
  Cash: 'Cash',
  Bank: 'Bank',
  Cheque: 'Cheque',
  Other: 'Other',
};

export const ProjectStatus = {
  Ongoing: 'Ongoing',
  Completed: 'Completed',
  OnHold: 'On Hold',
  Cancelled: 'Cancelled',
};

export const ProjectTypes = [
  'Residential', 'Commercial', 'Industrial', 'Renovation',
  'Infrastructure', 'Interior', 'Landscaping', 'Other',
];

export const WorkerRoles = [
  'Mason', 'Helper', 'Electrician', 'Supervisor', 'Plumber',
  'Carpenter', 'Painter', 'Welder', 'Driver', 'Operator',
  'Site Engineer', 'Foreman', 'Architect', 'Other',
];

export const WorkerStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
  Assigned: 'Assigned',
};

export const ObligationTypes = {
  ClientInvoice: 'ClientInvoice',
  WorkerPayroll: 'WorkerPayroll',
  MaterialPurchase: 'MaterialPurchase',
  ProjectExpense: 'ProjectExpense',
};

export const MeasurementUnits = [
  'sqft', 'sqm', 'ft', 'm', 'L/ft', 'cubes', 'cu/ft',
  'unit', 'kg', 'ton', 'liter', 'bag', 'hour', 'day',
  'trip', 'lot', 'Bags', 'Pieces', 'Rolls', 'Sheets',
  'Bundles', 'Meters', 'Other',
];

export const MaterialCategories = [
  'Cement', 'Steel', 'Aggregate', 'Masonry', 'Timber',
  'Plumbing', 'Electrical', 'Paint', 'Hardware', 'Tiles',
  'Glass', 'Roofing', 'Adhesives', 'Waterproofing',
  'Sand', 'Concrete', 'Finishing', 'Other',
];
