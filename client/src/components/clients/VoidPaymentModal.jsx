import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

import { useExchangeRate } from '../../context/ExchangeRateContext.jsx';
import { formatDualMoney } from '../../utils/currency.js';
import { formatDate, getConceptLabel } from './clientConstants.js';

export default function VoidPaymentModal({
  open,
  payment,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const { tipoCambioBob } = useExchangeRate();
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) setMotivo('');
  }, [open, payment]);

  if (!open || !payment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ motivo: motivo.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Anular abono</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">Esta acción no se puede deshacer</p>
              <p className="mt-1 text-red-700">
                El abono quedará marcado como anulado y dejará de sumar al saldo del cliente.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Monto</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {formatDualMoney(payment.monto, tipoCambioBob)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Fecha</dt>
                <dd className="font-medium text-slate-900">{formatDate(payment.fechaAbono)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Concepto</dt>
                <dd className="font-medium text-slate-900">{getConceptLabel(payment.concepto)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Método</dt>
                <dd className="font-medium text-slate-900">{payment.metodoPago}</dd>
              </div>
            </dl>
          </div>

          {error && <div role="alert" className="app-alert-error">{error}</div>}

          <div>
            <label htmlFor="void-motivo" className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo de anulación (opcional)
            </label>
            <textarea
              id="void-motivo"
              name="motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. error de registro, pago duplicado..."
              className="app-input !mt-0 w-full resize-none"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[160px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                'Confirmar anulación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
