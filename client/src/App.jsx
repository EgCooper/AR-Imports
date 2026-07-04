import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Login from './components/Login.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Clients = lazy(() => import('./pages/Clients.jsx'));
const Cotizaciones = lazy(() => import('./pages/Cotizaciones.jsx'));
const RegistrarPago = lazy(() => import('./pages/RegistrarPago.jsx'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Cargando vista" />
    </div>
  );
}

function LegacyPagosRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/pagos${search}`} replace />;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-label="Cargando" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/clients"
            element={
              <Suspense fallback={<PageLoader />}>
                <Clients />
              </Suspense>
            }
          />
          <Route
            path="/cotizaciones"
            element={
              <Suspense fallback={<PageLoader />}>
                <Cotizaciones />
              </Suspense>
            }
          />
          <Route
            path="/pagos"
            element={
              <Suspense fallback={<PageLoader />}>
                <RegistrarPago />
              </Suspense>
            }
          />
          <Route path="/pagos/registrar" element={<LegacyPagosRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
