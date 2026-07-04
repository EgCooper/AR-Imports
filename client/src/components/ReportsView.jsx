import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';

import { useExchangeRate } from '../context/ExchangeRateContext.jsx';
import api from '../services/api.js';
import { formatDualMoney } from '../utils/currency.js';
import { downloadCsvExport } from '../utils/exportCsv.js';
import { ESTADO_CONFIG, formatMoney } from './clients/clientConstants.js';

function KpiCard({ label, value, hint, className = '' }) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </article>
  );
}

export default function ReportsView() {
  const { tipoCambioBob } = useExchangeRate();
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  const buildParams = useCallback(() => {
    const params = {};
    if (fechaDesde) params.fechaDesde = fechaDesde;
    if (fechaHasta) params.fechaHasta = fechaHasta;
    return params;
  }, [fechaDesde, fechaHasta]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/summary', { params: buildParams() });
      if (response.data.success) setSummary(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const params = buildParams();
      if (type === 'quotes') {
        await downloadCsvExport('/reports/quotes/export.csv', 'reporte-cotizaciones.csv', params);
      } else if (type === 'payments') {
        await downloadCsvExport('/reports/payments/export.csv', 'reporte-pagos.csv', params);
      } else {
        await downloadCsvExport('/clients/export.csv', 'reporte-clientes.csv', params);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo exportar.');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen financiero y operativo. Filtra por período para acotar ingresos y registros.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="rep-desde" className="mb-1.5 block text-sm font-medium text-slate-700">Desde</label>
            <input id="rep-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="app-input !mt-0 w-full" />
          </div>
          <div>
            <label htmlFor="rep-hasta" className="mb-1.5 block text-sm font-medium text-slate-700">Hasta</label>
            <input id="rep-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="app-input !mt-0 w-full" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadSummary} disabled={loading} className="app-btn-primary min-h-11 w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Actualizar reporte
            </button>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="app-alert-error">{error}</div>}

      {loading && !summary ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : summary && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Clientes activos" value={summary.clientesActivos} />
            <KpiCard label="Cotizaciones activas" value={summary.cotizacionesActivas} />
            <KpiCard
              label="Ingresos del período"
              value={formatDualMoney(summary.ingresosPeriodo, tipoCambioBob)}
              hint={`${summary.cantidadPagosPeriodo} pagos`}
            />
            <KpiCard
              label="Saldo pendiente total"
              value={formatDualMoney(summary.saldoPendienteTotal, tipoCambioBob)}
              hint={`${summary.clientesConSaldo} clientes con saldo`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Clientes por estado</h2>
              <ul className="mt-4 space-y-2">
                {summary.clientesPorEstado.map(({ estado, count }) => (
                  <li key={estado} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">
                      {ESTADO_CONFIG[estado]?.label ?? estado}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Pagos por concepto</h2>
              {summary.pagosPorConcepto.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Sin pagos en el período seleccionado.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {summary.pagosPorConcepto.map(({ concepto, total, cantidad }) => (
                    <li key={concepto} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{concepto}</p>
                        <p className="text-xs text-slate-500">{cantidad} abono{cantidad !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-semibold tabular-nums text-emerald-700">{formatMoney(total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Exportar datos</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { id: 'clients', label: 'Clientes CSV' },
                { id: 'quotes', label: 'Cotizaciones CSV' },
                { id: 'payments', label: 'Pagos CSV' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleExport(id)}
                  disabled={Boolean(exporting)}
                  className="app-btn-secondary gap-2"
                >
                  {exporting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
