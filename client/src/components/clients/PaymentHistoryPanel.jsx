import { ExternalLink, Loader2 } from 'lucide-react';

import { formatDate, formatMoney, getConceptLabel } from './clientConstants.js';

export default function PaymentHistoryPanel({ historial, loading }) {
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
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">Historial de pagos</h2>
        <p className="mt-0.5 text-sm text-slate-500">{historial.length} abono{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="app-table-head">
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3">Método</th>
              <th className="px-6 py-3 text-right">Monto</th>
              <th className="px-6 py-3">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historial.map((pago) => (
              <tr key={pago._id ?? pago.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4 text-slate-600">{formatDate(pago.fechaAbono)}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{getConceptLabel(pago.concepto)}</td>
                <td className="px-6 py-4 text-slate-600">{pago.metodoPago}</td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums text-slate-900">{formatMoney(pago.monto)}</td>
                <td className="px-6 py-4">
                  {pago.comprobanteUrl ? (
                    <a href={pago.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="app-link inline-flex items-center gap-1">
                      Ver comprobante
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sin comprobante</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {historial.map((pago) => (
          <li key={pago._id ?? pago.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold tabular-nums text-slate-900">{formatMoney(pago.monto)}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{getConceptLabel(pago.concepto)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(pago.fechaAbono)} · {pago.metodoPago}</p>
              </div>
              {pago.comprobanteUrl && (
                <a href={pago.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="app-btn-secondary shrink-0 px-3 py-2 text-xs">
                  Comprobante
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
