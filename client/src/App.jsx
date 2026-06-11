import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Login from './components/Login.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Cotizaciones from './pages/Cotizaciones.jsx';
import RegistrarPago from './pages/RegistrarPago.jsx';

function LegacyPagosRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/pagos${search}`} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
        <Route path="/pagos" element={<RegistrarPago />} />
        <Route path="/pagos/registrar" element={<LegacyPagosRedirect />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
