import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import { ESTADOS_OPCIONES, formatMoney } from './clientConstants.js';

function getVehicleFromQuote(quote) {
  return quote.datosVehiculo?.trim()
    || [quote.marca, quote.modelo, quote.ano].filter(Boolean).join(' ')
    || '';
}

export default function ConvertQuoteModal({
  open,
  quote,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [form, setForm] = useState({
    nombreCompleto: '',
    telefono: '',
    vehiculo: '',
    vin: '',
    lote: '',
    estadoAuto: 'USA',
  });

  useEffect(() => {
    if (!open || !quote) return;
    setForm({
      nombreCompleto: quote.clienteNombre ?? '',
      telefono: quote.clienteTelefono ?? '',
      vehiculo: getVehicleFromQuote(quote),
      vin: '',
      lote: '',
      estadoAuto: 'USA',
    });
  }, [open, quote]);

  if (!open || !quote) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Convertir en cliente</h2>
            <p className="text-sm text-slate-500">Total cotización: {formatMoney(quote.costoTotalCalculado)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Se registrará un cliente con el costo pactado igual al total de la cotización y quedarán vinculados.
          </div>

          {error && <div role="alert" className="app-alert-error">{error}</div>}

          <Field label="Nombre *" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange} required />
          <Field label="Teléfono *" name="telefono" type="tel" value={form.telefono} onChange={handleChange} required />
          <Field label="Vehículo" name="vehiculo" value={form.vehiculo} onChange={handleChange} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="VIN *" name="vin" value={form.vin} onChange={handleChange} required />
            <Field label="Lote *" name="lote" value={form.lote} onChange={handleChange} required />
          </div>

          <div>
            <label htmlFor="convert-estado" className="mb-1.5 block text-sm font-medium text-slate-700">Estado inicial *</label>
            <select id="convert-estado" name="estadoAuto" value={form.estadoAuto} onChange={handleChange} className="app-input !mt-0 w-full">
              {ESTADOS_OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">Cancelar</button>
            <button type="submit" disabled={submitting} className="app-btn-block sm:min-w-[180px]">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Registrando...</span> : 'Registrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input id={name} name={name} type={type} required={required} value={value} onChange={onChange} className="app-input !mt-0 w-full" />
    </div>
  );
}
