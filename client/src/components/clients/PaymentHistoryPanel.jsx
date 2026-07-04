import { Ban, Download, ExternalLink, Loader2, Pencil } from 'lucide-react';

import { useExchangeRate } from '../../context/ExchangeRateContext.jsx';
import { resolveUploadUrl } from '../../services/auth.js';
import { formatDualMoney } from '../../utils/currency.js';
import { formatDate, getConceptLabel } from './clientConstants.js';

export default function PaymentHistoryPanel({
  historial,
  loading,
  onEdit,
  onVoid,
  onExport,
  exporting = false,
}) {
  const { tipoCambioBob } = useExchangeRate();

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </section>
    );
  }

  if (!historial) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Selecciona un cliente para ver su historial de abonos.</p>
      </section>
    );
  }

  if (historial.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Este cliente aún no tiene abonos registrados.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historial de pagos</h2>
          <p className="mt-0.5 text-sm text-slate-500">{historial.length} abono{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}</p>
        </div>
        {onExport && (
          <button type="button" onClick={onExport} disabled={exporting} className="app-btn-secondary gap-2 self-start">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </button>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="app-table-head">
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3">Método</th>
              <th className="px-6 py-3 text-right">Monto</th>
              <th className="px-6 py-3">Comprobante</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historial.map((pago) => (
              <tr key={pago.id} className={`hover:bg-slate-50/80 ${pago.anulado ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-slate-600">{formatDate(pago.fechaAbono)}</td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  {getConceptLabel(pago.concepto)}
                  {pago.anulado && <span className="ml-2 text-xs font-semibold uppercase text-red-600">Anulado</span>}
                </td>
                <td className="px-6 py-4 text-slate-600">{pago.metodoPago}</td>
                <td className={`px-6 py-4 text-right font-semibold tabular-nums ${pago.anulado ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatDualMoney(pago.monto, tipoCambioBob)}
                </td>
                <td className="px-6 py-4">
                  {pago.comprobanteUrl ? (
                    <a
                      href={resolveUploadUrl(pago.comprobanteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="app-link inline-flex items-center gap-1"
                    >
                      Ver comprobante
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sin comprobante</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {!pago.anulado && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit?.(pago)}
                        title="Editar abono"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoid?.(pago)}
                        title="Anular abono"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {historial.map((pago) => (
          <li key={pago.id} className={`px-4 py-4 sm:px-6 ${pago.anulado ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-semibold tabular-nums ${pago.anulado ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatDualMoney(pago.monto, tipoCambioBob)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {getConceptLabel(pago.concepto)}
                  {pago.anulado && <span className="ml-2 text-xs font-semibold uppercase text-red-600">Anulado</span>}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(pago.fechaAbono)} · {pago.metodoPago}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!pago.anulado && (
                  <>
                    <button type="button" onClick={() => onEdit?.(pago)} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onVoid?.(pago)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50">
                      <Ban className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
