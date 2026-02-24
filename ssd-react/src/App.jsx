import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { Analytics } from '@vercel/analytics/react';
import { seedIfEmpty } from './data/db';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const Workers = lazy(() => import('./pages/Workers'));
const Materials = lazy(() => import('./pages/Materials'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Attendance = lazy(() => import('./pages/Attendance'));
const BOQGenerator = lazy(() => import('./pages/BOQGenerator'));
const ProjectFinancialOverview = lazy(() => import('./pages/ProjectFinancialOverview'));
const Advances = lazy(() => import('./pages/Advances'));
const Rates = lazy(() => import('./pages/Rates'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const BankAccounts = lazy(() => import('./pages/BankAccounts'));
const Clients = lazy(() => import('./pages/Clients'));
const AgreementGenerator = lazy(() => import('./pages/AgreementGenerator'));
const PersonnelCommand = lazy(() => import('./pages/PersonnelCommand'));
const Settings = lazy(() => import('./pages/Settings'));

seedIfEmpty();

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Suspense fallback={null}><Login /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={null}><Signup /></Suspense>} />

          {/* Protected Application Routes with Persistent Shell */}
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/clients" element={<Clients />} />
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
              <Route path="/bank-accounts" element={<BankAccounts />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/personnel-command" element={<PersonnelCommand />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
      <Analytics />
    </BrowserRouter>
  );
}
