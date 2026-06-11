import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Receipt, Trash2, X } from 'lucide-react';

import { downloadPaymentReceiptPdf } from '../../utils/exportPaymentReceiptPdf.js';
import {
  CONCEPTOS_PAGO,
  METODOS_PAGO,
  formatMoney,
  getVehicleLabel,
} from './clientConstants.js';

const PAGO_INICIAL = {
  clienteId: '',
  monto: '',
  fechaAbono: new Date().toISOString().slice(0, 10),
  concepto: 'PAGO_INICIAL',
  metodoPago: 'EFECTIVO',
  notas: '',
};

const MAX_SIZE_MB = 8;

function ComprobanteUpload({ comprobante, onSelect, onRemove, disabled }) {
  const inputRef = useRef(null);

  const handleFile = (fileList) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return;

    onSelect({
      id: `${file.name}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
    });
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        Comprobante de depósito
      </label>
      <p className="mb-3 text-xs text-slate-500">
        Sube una captura del depósito o transferencia (JPG, PNG, WEBP). Máx. {MAX_SIZE_MB} MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || !!comprobante}
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = '';
        }}
      />

      {!comprobante ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="h-7 w-7 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Subir captura de comprobante</span>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <img
            src={comprobante.preview}
            alt="Vista previa del comprobante"
            className="max-h-48 w-full object-contain"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white transition hover:bg-red-600 disabled:opacity-50"
            aria-label="Quitar comprobante"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RegisterPaymentModal({
  open,
  onClose,
  clients,
  summaries,
  initialClientId = '',
  onSubmit,
  submitting,
  error,
}) {
  const [form, setForm] = useState({ ...PAGO_INICIAL });
  const [comprobante, setComprobante] = useState(null);
  const formScrollRef = useRef(null);
  const summaryRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...PAGO_INICIAL,
        clienteId: initialClientId || '',
      });
      setComprobante(null);
    } else {
      setComprobante((prev) => {
        if (prev?.preview) URL.revokeObjectURL(prev.preview);
        return null;
      });
    }
  }, [open, initialClientId]);

  const summary = form.clienteId ? summaries[form.clienteId] : null;
  const client = clients.find((c) => c.id === form.clienteId);

  const handleClientChange = (e) => {
    const clienteId = e.target.value;
    setForm((p) => ({ ...p, clienteId }));

    if (!clienteId) return;

    requestAnimationFrame(() => {
      const container = formScrollRef.current;
      const summary = summaryRef.current;
      if (!container || !summary) return;
      const top = summary.offsetTop - container.offsetTop - 12;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleRemoveComprobante = () => {
    if (comprobante?.preview) URL.revokeObjectURL(comprobante.preview);
    setComprobante(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      monto: Number(form.monto),
      comprobanteFile: comprobante?.file ?? null,
      notas: form.notas || undefined,
    });
  };

  const handleGenerateReceipt = () => {
    if (!client || !form.monto) return;
    downloadPaymentReceiptPdf({
      cliente: client,
      pago: { ...form, monto: Number(form.monto) },
      resumen: summary?.resumenFinanciero,
      summary,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Registrar Pago</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div ref={formScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {error && <div role="alert" className="mb-4 app-alert-error">{error}</div>}

          <div>
            <label htmlFor="clienteId" className="mb-1.5 block text-sm font-medium text-slate-700">
              Cliente registrado *
            </label>
            <select
              id="clienteId"
              name="clienteId"
              required
              value={form.clienteId}
              onChange={handleClientChange}
              className="app-input !mt-0 w-full"
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nombreCompleto} · Lote {c.lote}</option>
              ))}
            </select>
          </div>

          {summary && client && (
            <div ref={summaryRef} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resumen del cliente</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Nombre</dt>
                  <dd className="font-medium text-slate-900">{client.nombreCompleto}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Vehículo</dt>
                  <dd className="truncate font-medium text-slate-900">{getVehicleLabel(client, summary)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Total abonado</dt>
                  <dd className="font-semibold text-emerald-700">{formatMoney(summary.resumenFinanciero.totalPagado)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Saldo</dt>
                  <dd className={`font-semibold ${summary.resumenFinanciero.saldoPendiente > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {summary.resumenFinanciero.saldoPendiente > 0
                      ? formatMoney(summary.resumenFinanciero.saldoPendiente)
                      : 'Liquidado'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className={`space-y-4 ${summary ? 'mt-5' : 'mt-5 opacity-50 pointer-events-none'}`}>
            <Field label="Costo de abono a realizar (USD) *" name="monto" type="number" min="0.01" step="0.01" value={form.monto} onChange={handleChange} required disabled={!form.clienteId} />
            <Field label="Fecha del abono *" name="fechaAbono" type="date" value={form.fechaAbono} onChange={handleChange} required disabled={!form.clienteId} />

            <div>
              <label htmlFor="concepto" className="mb-1.5 block text-sm font-medium text-slate-700">Concepto del pago *</label>
              <select id="concepto" name="concepto" value={form.concepto} onChange={handleChange} disabled={!form.clienteId} className="app-input !mt-0 w-full">
                {CONCEPTOS_PAGO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="metodoPago" className="mb-1.5 block text-sm font-medium text-slate-700">Método de pago *</label>
              <select id="metodoPago" name="metodoPago" value={form.metodoPago} onChange={handleChange} disabled={!form.clienteId} className="app-input !mt-0 w-full">
                {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <ComprobanteUpload
              comprobante={comprobante}
              onSelect={setComprobante}
              onRemove={handleRemoveComprobante}
              disabled={!form.clienteId || submitting}
            />

            <div>
              <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-slate-700">Notas adicionales</label>
              <textarea id="notas" name="notas" rows={3} value={form.notas} onChange={handleChange} disabled={!form.clienteId} className="app-input !mt-0 w-full resize-none" placeholder="Detalle opcional..." />
            </div>

            <button
              type="button"
              disabled={!form.clienteId || !form.monto}
              onClick={handleGenerateReceipt}
              className="app-btn-secondary min-h-11 w-full gap-2"
            >
              <Receipt className="h-4 w-4" />
              Descargar recibo PDF
            </button>
          </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">
              Cancelar
            </button>
            <button type="submit" disabled={submitting || !form.clienteId} className="app-btn-block sm:w-auto sm:min-w-[160px]">
              {submitting ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Registrando...</span>
              ) : (
                'Registrar pago'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder, min, step, disabled }) {
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
        disabled={disabled}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="app-input !mt-0 w-full disabled:bg-slate-100 disabled:opacity-70"
      />
    </div>
  );
}
