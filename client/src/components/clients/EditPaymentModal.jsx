import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import { CONCEPTOS_PAGO, METODOS_PAGO } from './clientConstants.js';

export default function EditPaymentModal({
  open,
  payment,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [form, setForm] = useState({
    monto: '',
    fechaAbono: '',
    concepto: 'PAGO_INICIAL',
    metodoPago: 'EFECTIVO',
    notas: '',
  });

  useEffect(() => {
    if (!payment) return;
    setForm({
      monto: String(payment.monto ?? ''),
      fechaAbono: payment.fechaAbono
        ? new Date(payment.fechaAbono).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      concepto: payment.concepto ?? 'PAGO_INICIAL',
      metodoPago: payment.metodoPago ?? 'EFECTIVO',
      notas: payment.notas ?? '',
    });
  }, [payment]);

  if (!open || !payment) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      monto: Number(form.monto),
      notas: form.notas || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Editar abono</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && <div role="alert" className="app-alert-error">{error}</div>}

          <Field label="Monto (USD) *" name="monto" type="number" min="0.01" step="0.01" value={form.monto} onChange={handleChange} required />
          <Field label="Fecha *" name="fechaAbono" type="date" value={form.fechaAbono} onChange={handleChange} required />

          <div>
            <label htmlFor="edit-concepto" className="mb-1.5 block text-sm font-medium text-slate-700">Concepto *</label>
            <select id="edit-concepto" name="concepto" value={form.concepto} onChange={handleChange} className="app-input !mt-0 w-full">
              {CONCEPTOS_PAGO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="edit-metodo" className="mb-1.5 block text-sm font-medium text-slate-700">Método *</label>
            <select id="edit-metodo" name="metodoPago" value={form.metodoPago} onChange={handleChange} className="app-input !mt-0 w-full">
              {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="edit-notas" className="mb-1.5 block text-sm font-medium text-slate-700">Notas</label>
            <textarea id="edit-notas" name="notas" rows={3} value={form.notas} onChange={handleChange} className="app-input !mt-0 w-full resize-none" />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">Cancelar</button>
            <button type="submit" disabled={submitting} className="app-btn-block sm:min-w-[140px]">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, min, step }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={step}
        value={value}
        onChange={onChange}
        className="app-input !mt-0 w-full"
      />
    </div>
  );
}
