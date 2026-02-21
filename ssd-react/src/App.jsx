import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Workers from './pages/Workers';
import Materials from './pages/Materials';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Attendance from './pages/Attendance';
import BOQGenerator from './pages/BOQGenerator';
import ProjectFinancialOverview from './pages/ProjectFinancialOverview';
import Advances from './pages/Advances';
import Rates from './pages/Rates';
import Suppliers from './pages/Suppliers';
import BankAccounts from './pages/BankAccounts'; // Added import
import AgreementGenerator from './pages/AgreementGenerator';

import Settings from './pages/Settings';
import { seedIfEmpty } from './data/db';

seedIfEmpty();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/boq-generator" element={<BOQGenerator />} />
          <Route path="/agreements" element={<AgreementGenerator />} />
          <Route path="/project-overview" element={<ProjectFinancialOverview />} />
          <Route path="/advances" element={<Advances />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/bank-accounts" element={<BankAccounts />} /> {/* Added route */}
          <Route path="/suppliers" element={<Suppliers />} />

          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
