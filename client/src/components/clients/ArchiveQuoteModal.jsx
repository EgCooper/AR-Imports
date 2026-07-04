import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

import { formatMoney } from './clientConstants.js';

function vehicleLabel(quote) {
  return quote.datosVehiculo?.trim()
    || [quote.marca, quote.modelo, quote.ano].filter(Boolean).join(' ')
    || 'Cotización';
}

export default function ArchiveQuoteModal({ open, quote, onClose, onSubmit, submitting, error }) {
  const [motivo, setMotivo] = useState('');

  if (!open || !quote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Archivar cotización</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ motivo: motivo.trim() || undefined });
          }}
          className="space-y-4 px-5 py-5"
        >
          <div role="alert" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{vehicleLabel(quote)}</p>
              <p className="mt-1">Total: {formatMoney(quote.costoTotalCalculado)}</p>
            </div>
          </div>

          {error && <div role="alert" className="app-alert-error">{error}</div>}

          <div>
            <label htmlFor="quote-archive-motivo" className="mb-1.5 block text-sm font-medium text-slate-700">Motivo (opcional)</label>
            <textarea id="quote-archive-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="app-input !mt-0 w-full resize-none" />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">Cancelar</button>
            <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 font-semibold text-white hover:bg-amber-700 disabled:opacity-60 sm:min-w-[160px]">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Archivando...</> : 'Archivar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
