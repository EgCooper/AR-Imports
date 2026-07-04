import { Loader2, X } from 'lucide-react';

import { ESTADO_CONFIG, formatDate } from './clientConstants.js';

export default function ClientTimelineModal({ open, client, historial, loading, onClose }) {
  if (!open || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Historial de estados</h2>
            <p className="text-sm text-slate-500">{client.nombreCompleto}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : historial?.length ? (
            <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
              {historial.map((entry) => {
                const config = ESTADO_CONFIG[entry.estadoNuevo];
                return (
                  <li key={entry.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-600" />
                    <p className="text-xs text-slate-500">{formatDate(entry.fechaCambio)}</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {entry.estadoAnterior
                        ? `${ESTADO_CONFIG[entry.estadoAnterior]?.label ?? entry.estadoAnterior} → ${config?.label ?? entry.estadoNuevo}`
                        : config?.label ?? entry.estadoNuevo}
                    </p>
                    {entry.notas && <p className="mt-1 text-sm text-slate-600">{entry.notas}</p>}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Sin cambios de estado registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
