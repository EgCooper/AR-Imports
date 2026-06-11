import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Car,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';

import api from '../services/api.js';
import { ESTADO_CONFIG } from './clients/clientConstants.js';

const METRICAS_INICIALES = {
  cotizacionesHechas: 0,
  ventasHechas: 0,
  clientesRegistrados: 0,
  vehiculosEnChile: 0,
  vehiculosEnBolivia: 0,
  vehiculosEnAduana: 0,
  vehiculosEnTaller: 0,
};

function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

function StatusBadge({ estado }) {
  const config = ESTADO_CONFIG[estado] ?? { label: estado, badge: ESTADO_CONFIG.USA.badge };
  return <span className={config.badge}>{config.label}</span>;
}

const ICON_ACCENTS = {
  orange: 'bg-orange-100 text-orange-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  slate: 'bg-slate-100 text-slate-600',
};

function MetricCard({ icon: Icon, label, value, accent = 'slate' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ICON_ACCENTS[accent]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function PaymentMobileCard({ pago }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{pago.clienteNombre}</p>
          <p className="mt-1 truncate text-sm text-slate-500">{pago.vehiculo}</p>
        </div>
        <StatusBadge estado={pago.estadoAuto} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">{formatDate(pago.fecha)}</span>
        <span className="text-base font-bold text-emerald-700">{formatMoney(pago.monto)}</span>
      </div>
    </article>
  );
}

export default function DashboardView() {
  const location = useLocation();
  const [metricas, setMetricas] = useState(METRICAS_INICIALES);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/dashboard');
      if (response.data.success) {
        setMetricas(response.data.data.metricas);
        setPagos(response.data.data.pagosRecientes ?? []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [location.pathname, fetchDashboard]);

  const metricCards = [
    { key: 'cotizacionesHechas', label: 'Cotizaciones hechas', icon: ClipboardList, accent: 'orange' },
    { key: 'ventasHechas', label: 'Ventas hechas', icon: TrendingUp, accent: 'emerald' },
    { key: 'vehiculosEnChile', label: 'Vehículos en Chile', icon: MapPin, accent: 'orange' },
    { key: 'vehiculosEnBolivia', label: 'Vehículos en Bolivia', icon: Car, accent: 'purple' },
    { key: 'vehiculosEnAduana', label: 'Vehículos en Aduana', icon: Package, accent: 'blue' },
    { key: 'vehiculosEnTaller', label: 'Vehículos en el Taller', icon: Wrench, accent: 'emerald' },
    { key: 'clientesRegistrados', label: 'Clientes registrados', icon: Users, accent: 'slate' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard General</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen operativo de cotizaciones, ventas y logística.</p>
      </div>

      {error && <div role="alert" className="app-alert-error">{error}</div>}

      <section aria-label="Métricas del negocio">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.key} icon={card.icon} label={card.label} value={metricas[card.key] ?? 0} accent={card.accent} />
          ))}
        </div>
      </section>

      <section aria-label="Pagos recientes" className="app-card !p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">Pagos recientes</h2>
          <p className="mt-1 text-sm text-slate-500">Últimas transacciones registradas</p>
        </div>

        {pagos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">Aún no hay pagos registrados.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="app-table-head">
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Monto</th>
                    <th className="px-6 py-3.5">Vehículo</th>
                    <th className="px-6 py-3.5">Estado del vehículo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="app-row-hover">
                      <td className="px-6 py-4 font-semibold text-slate-900">{pago.clienteNombre}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(pago.fecha)}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">{formatMoney(pago.monto)}</td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-slate-600">{pago.vehiculo}</td>
                      <td className="px-6 py-4"><StatusBadge estado={pago.estadoAuto} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {pagos.map((pago) => (
                <PaymentMobileCard key={pago.id} pago={pago} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
