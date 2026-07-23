import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  UserPlus,
  X,
} from 'lucide-react';

import api from '../services/api.js';
import { useExchangeRate } from '../context/ExchangeRateContext.jsx';
import ArchiveQuoteModal from './clients/ArchiveQuoteModal.jsx';
import ConvertQuoteModal from './clients/ConvertQuoteModal.jsx';
import { buildQuoteShareText } from '../utils/shareDocument.js';
import { parseQuotesResponse } from '../utils/paymentSummaries.js';
import ExchangeRateControl from './shared/ExchangeRateControl.jsx';
import ShareActions from './shared/ShareActions.jsx';
import { formatDate, formatMoney } from './clients/clientConstants.js';
import { convertUsdToBob, formatBob } from '../utils/currency.js';

const DEFAULT_PORCENTAJE_TRANSFERENCIA = 3;

const NUMERIC_FIELDS = [
  'totalVehiculo',
  'fees',
  'tarifaUsa',
  'comisionTresPorcento',
  'transporte',
  'guiaParaRecoger',
  'comisionImportador',
  'documentoIngreso',
  'chaperia',
  'pintura',
  'repuestos',
  'poliza',
  'tramitesAduana',
];

const VEHICLE_FIELDS = [
  { key: 'marca', label: 'Marca', placeholder: 'Toyota' },
  { key: 'modelo', label: 'Modelo', placeholder: 'Corolla' },
  { key: 'ano', label: 'Año', placeholder: '2022' },
];

const TIPOS_VEHICULO = [
  { value: 'AUTO', label: 'Automóvil' },
  { value: 'MOTO', label: 'Motocicleta' },
];

const FORM_INICIAL = {
  marca: '',
  modelo: '',
  ano: '',
  tipoVehiculo: 'AUTO',
  porcentajeTransferenciaUsa: String(DEFAULT_PORCENTAJE_TRANSFERENCIA),
  ...Object.fromEntries(NUMERIC_FIELDS.map((f) => [f, '0'])),
};

/** Temas de color por sección (alineados al manual de marca ARR-Imports). */
const GRUPO_THEMES = {
  origen: {
    card: 'border-slate-300 bg-white',
    bar: 'bg-slate-500',
    header: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-500 text-white',
    title: 'text-slate-900',
    desc: 'text-slate-500',
    detail: 'border-slate-200 bg-slate-50',
    detailTitle: 'text-slate-800',
  },
  logistica: {
    card: 'border-blue-200 bg-white',
    bar: 'bg-blue-500',
    header: 'bg-blue-50 border-blue-100',
    badge: 'bg-blue-500 text-white',
    title: 'text-blue-950',
    desc: 'text-blue-700/70',
    detail: 'border-blue-200 bg-blue-50',
    detailTitle: 'text-blue-900',
  },
  taller: {
    card: 'border-emerald-200 bg-white',
    bar: 'bg-emerald-600',
    header: 'bg-emerald-50 border-emerald-100',
    badge: 'bg-emerald-600 text-white',
    title: 'text-emerald-950',
    desc: 'text-emerald-800/70',
    detail: 'border-emerald-200 bg-emerald-50',
    detailTitle: 'text-emerald-900',
  },
  legal: {
    card: 'border-purple-200 bg-white',
    bar: 'bg-purple-500',
    header: 'bg-purple-50 border-purple-100',
    badge: 'bg-purple-500 text-white',
    title: 'text-purple-950',
    desc: 'text-purple-800/70',
    detail: 'border-purple-200 bg-purple-50',
    detailTitle: 'text-purple-900',
  },
};

const GRUPOS = [
  {
    id: 'origen',
    step: 1,
    titulo: 'Origen, Compra y Datos',
    descripcion: 'Datos del vehículo y costos de adquisición en USA',
    theme: GRUPO_THEMES.origen,
    campos: [
      { key: 'totalVehiculo', type: 'money', label: 'Precio de compra aprox.' },
      { key: 'fees', type: 'money', label: 'Fees' },
      {
        key: 'tarifaUsa',
        type: 'transferencia',
        label: 'Transferencia USA',
        percentageKey: 'porcentajeTransferenciaUsa',
        hint: 'Se calcula con el % sobre el precio de compra; puedes cambiar el % o el monto.',
      },
    ],
  },
  {
    id: 'logistica',
    step: 2,
    titulo: 'Logística Intermedia',
    descripcion: 'Transporte y gestión intermedia',
    theme: GRUPO_THEMES.logistica,
    campos: [
      { key: 'transporte', type: 'money', label: 'Grúa interna / Transporte' },
      { key: 'guiaParaRecoger', type: 'money', label: 'Guía para recoger' },
      { key: 'comisionImportador', type: 'money', label: 'Comisión general' },
      { key: 'documentoIngreso', type: 'money', label: 'Documento de ingreso' },
    ],
  },
  {
    id: 'taller',
    step: 3,
    titulo: 'Taller y Reacondicionamiento',
    descripcion: 'Trabajos de chapería, pintura y repuestos',
    theme: GRUPO_THEMES.taller,
    campos: [
      { key: 'chaperia', type: 'money', label: 'Chapería' },
      { key: 'pintura', type: 'money', label: 'Pintura' },
      { key: 'repuestos', type: 'money', label: 'Repuestos' },
    ],
  },
  {
    id: 'legal',
    step: 4,
    titulo: 'Legalización y Aduana',
    descripcion: 'Póliza y trámites aduanales',
    theme: GRUPO_THEMES.legal,
    campos: [
      { key: 'poliza', type: 'money', label: 'Póliza' },
      { key: 'tramitesAduana', type: 'money', label: 'Trámites aduana' },
    ],
  },
];

function num(value) {
  return Number(value) || 0;
}

function calcularTransferenciaUsa(totalVehiculo, porcentaje) {
  const rate = num(porcentaje) / 100;
  return String(Number((num(totalVehiculo) * rate).toFixed(2)));
}

function resolvePorcentajeTransferencia(quote, transferenciaAmount) {
  const stored = Number(quote?.porcentajeTransferenciaUsa);
  if (Number.isFinite(stored) && stored > 0) {
    return String(stored);
  }
  const precio = num(quote?.totalVehiculo);
  if (precio > 0 && num(transferenciaAmount) > 0) {
    return String(Number(((num(transferenciaAmount) / precio) * 100).toFixed(2)));
  }
  return String(DEFAULT_PORCENTAJE_TRANSFERENCIA);
}

function buildVehicleLabel(form) {
  const tipo = TIPOS_VEHICULO.find((t) => t.value === form.tipoVehiculo)?.label ?? form.tipoVehiculo;
  const parts = [form.marca, form.modelo, form.ano, tipo].filter(Boolean);
  return parts.join(' · ');
}

function mapFormToPayload(form) {
  const payload = {
    datosVehiculo: buildVehicleLabel(form),
    marca: form.marca.trim() || undefined,
    modelo: form.modelo.trim() || undefined,
    ano: form.ano ? Number(form.ano) : undefined,
    tipoVehiculo: form.tipoVehiculo || undefined,
    porcentajeTransferenciaUsa: num(form.porcentajeTransferenciaUsa),
  };
  NUMERIC_FIELDS.forEach((f) => {
    payload[f] = num(form[f]);
  });
  // Un solo rubro visible: Transferencia USA (se guarda en tarifaUsa).
  payload.tarifaUsa = num(form.tarifaUsa);
  payload.comisionTresPorcento = 0;
  return payload;
}

function quoteToForm(quote) {
  const form = { ...FORM_INICIAL };
  if (!quote) return form;

  form.marca = quote.marca ?? '';
  form.modelo = quote.modelo ?? '';
  form.ano = quote.ano != null ? String(quote.ano) : '';
  form.tipoVehiculo = quote.tipoVehiculo ?? 'AUTO';
  NUMERIC_FIELDS.forEach((f) => {
    form[f] = String(quote[f] ?? 0);
  });
  // Consolida rubros legacy (tarifaUsa + comisión vehículo + transferenciaDineroUsa).
  const legacyTransfer = Number(quote.transferenciaDineroUsa);
  const mergedTransfer =
    num(form.tarifaUsa) +
    num(form.comisionTresPorcento) +
    (Number.isFinite(legacyTransfer) ? legacyTransfer : 0);
  form.tarifaUsa = String(mergedTransfer);
  form.comisionTresPorcento = '0';
  form.porcentajeTransferenciaUsa = resolvePorcentajeTransferencia(quote, mergedTransfer);
  return form;
}

function getQuoteVehicleLabel(quote) {
  if (quote.datosVehiculo) return quote.datosVehiculo;
  const tipo = TIPOS_VEHICULO.find((t) => t.value === quote.tipoVehiculo)?.label ?? quote.tipoVehiculo;
  const parts = [quote.marca, quote.modelo, quote.ano, tipo].filter(Boolean);
  return parts.join(' · ') || 'Sin datos de vehículo';
}

function MoneyInput({ name, label, value, onChange, readOnly, disabled, hint }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div
        className={`flex min-h-11 overflow-hidden rounded-lg border transition-colors ${
          readOnly
            ? 'border-slate-200 bg-slate-100'
            : 'border-slate-200 bg-slate-50 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20'
        }`}
      >
        <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-100 text-sm font-medium text-slate-500">
          $
        </span>
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          readOnly={readOnly}
          disabled={disabled || readOnly}
          value={value}
          onChange={onChange}
          className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${
            readOnly ? 'cursor-not-allowed text-slate-600' : ''
          }`}
        />
      </div>
      {hint && !readOnly && (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function TransferenciaUsaInput({
  amountName,
  percentageName,
  label,
  amount,
  percentage,
  onChange,
  readOnly,
  disabled,
  hint,
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={amountName} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7.5rem_1fr]">
        <div>
          <div
            className={`flex min-h-11 overflow-hidden rounded-lg border transition-colors ${
              readOnly
                ? 'border-slate-200 bg-slate-100'
                : 'border-slate-200 bg-slate-50 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20'
            }`}
          >
            <input
              id={percentageName}
              name={percentageName}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="3"
              readOnly={readOnly}
              disabled={disabled || readOnly}
              value={percentage}
              onChange={onChange}
              aria-label="Porcentaje transferencia USA"
              className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${
                readOnly ? 'cursor-not-allowed text-slate-600' : ''
              }`}
            />
            <span className="flex w-10 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-100 text-sm font-medium text-slate-500">
              %
            </span>
          </div>
        </div>
        <div
          className={`flex min-h-11 overflow-hidden rounded-lg border transition-colors ${
            readOnly
              ? 'border-slate-200 bg-slate-100'
              : 'border-slate-200 bg-slate-50 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20'
          }`}
        >
          <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-100 text-sm font-medium text-slate-500">
            $
          </span>
          <input
            id={amountName}
            name={amountName}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            readOnly={readOnly}
            disabled={disabled || readOnly}
            value={amount}
            onChange={onChange}
            className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${
              readOnly ? 'cursor-not-allowed text-slate-600' : ''
            }`}
          />
        </div>
      </div>
      {hint && !readOnly && (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function VehicleFields({ form, onChange, disabled }) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 border-b border-slate-100 pb-5 sm:grid-cols-2">
      {VEHICLE_FIELDS.map((field) => (
        <div key={field.key}>
          <label htmlFor={field.key} className="mb-1.5 block text-sm font-medium text-slate-700">
            {field.label}
          </label>
          <input
            id={field.key}
            name={field.key}
            type="text"
            value={form[field.key]}
            onChange={onChange}
            disabled={disabled}
            placeholder={field.placeholder}
            className="app-input !mt-0 w-full border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>
      ))}
      <div>
        <label htmlFor="tipoVehiculo" className="mb-1.5 block text-sm font-medium text-slate-700">
          Tipo
        </label>
        <select
          id="tipoVehiculo"
          name="tipoVehiculo"
          value={form.tipoVehiculo}
          onChange={onChange}
          disabled={disabled}
          className="app-input !mt-0 w-full border-slate-200 bg-slate-50 focus:bg-white"
        >
          {TIPOS_VEHICULO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function QuoteGroupCard({ grupo, form, onChange, disabled, showVehicleFields, readOnly }) {
  const theme = grupo.theme;

  return (
    <section
      className={`mb-6 overflow-hidden rounded-2xl border shadow-sm ${theme.card}`}
    >
      <div className={`flex items-stretch border-b ${theme.header}`}>
        <div className={`w-1.5 shrink-0 ${theme.bar}`} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-start gap-3 px-5 py-4 sm:px-6">
          <span
            className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${theme.badge}`}
            aria-hidden="true"
          >
            {grupo.step}
          </span>
          <div className="min-w-0">
            <h3 className={`text-base font-semibold sm:text-lg ${theme.title}`}>{grupo.titulo}</h3>
            <p className={`mt-0.5 text-sm ${theme.desc}`}>{grupo.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {showVehicleFields && (
          <VehicleFields form={form} onChange={onChange} disabled={disabled || readOnly} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {grupo.campos.map((campo) =>
            campo.type === 'transferencia' ? (
              <TransferenciaUsaInput
                key={campo.key}
                amountName={campo.key}
                percentageName={campo.percentageKey}
                label={campo.label}
                amount={form[campo.key]}
                percentage={form[campo.percentageKey]}
                onChange={onChange}
                readOnly={campo.readOnly || readOnly}
                disabled={disabled || readOnly}
                hint={campo.hint}
              />
            ) : (
              <MoneyInput
                key={campo.key}
                name={campo.key}
                label={campo.label}
                value={form[campo.key]}
                onChange={onChange}
                readOnly={campo.readOnly || readOnly}
                disabled={disabled || readOnly}
                hint={campo.hint}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(value)}</span>
    </div>
  );
}

function QuoteTotalBlock({ usdAmount, tipoCambioBob, compact = false }) {
  const bob = tipoCambioBob ? convertUsdToBob(usdAmount, tipoCambioBob) : null;

  if (compact) {
    return (
      <div>
        <p className="text-xl font-bold tabular-nums">{formatMoney(usdAmount)}</p>
        {bob != null && (
          <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-300">
            {formatBob(bob)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{formatMoney(usdAmount)}</p>
      {bob != null && (
        <>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
            {formatBob(bob)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Tipo de cambio: {tipoCambioBob} Bs/USD</p>
        </>
      )}
    </div>
  );
}

function FinancialSummary({
  subtotales,
  granTotal,
  vehicleLabel,
  clientName,
  tipoCambioBob,
  onDownload,
  onSave,
  saving,
  canSave,
  formMode,
  readOnly,
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:sticky md:top-6">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Resumen financiero</h2>
        {clientName && (
          <p className="mt-1 text-sm font-medium text-emerald-700">{clientName}</p>
        )}
        {vehicleLabel && (
          <p className="mt-1 text-sm text-slate-500">{vehicleLabel}</p>
        )}
      </div>

      <div className="space-y-0">
        <SummaryRow label="Precio de compra" value={subtotales.precioCompra} />
        <SummaryRow label="Transferencia USA" value={subtotales.transferenciaUsa} />
        <SummaryRow label="Comisión general" value={subtotales.comision} />
        <SummaryRow label="Logística y transporte" value={subtotales.logistica} />
        <SummaryRow label="Trámites y documentación" value={subtotales.tramites} />
      </div>

      <div className="mt-5 rounded-xl bg-[#0a1926] px-5 py-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Total cotización</p>
        <QuoteTotalBlock usdAmount={granTotal} tipoCambioBob={tipoCambioBob} />
      </div>

      <div className="mt-6 space-y-3">
        <button type="button" onClick={onDownload} className="app-btn-secondary min-h-12 w-full gap-2">
          <Download className="h-4 w-4" />
          Descargar cotización PDF
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00875a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {formMode === 'edit' ? 'Guardar cambios' : 'Guardar cotización'}
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

function QuoteDetailModal({ quote, onClose, onEdit, onDownload, onConvert, tipoCambioBob }) {
  if (!quote) return null;

  const vehicleLabel = getQuoteVehicleLabel(quote);
  const shareText = buildQuoteShareText(quote, tipoCambioBob);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Detalle de cotización</h2>
            <p className="text-sm text-slate-500">{vehicleLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {quote.clienteNombre && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</p>
              <p className="mt-1 font-medium text-slate-900">{quote.clienteNombre}</p>
              {quote.clienteTelefono && (
                <p className="text-sm text-slate-500">{quote.clienteTelefono}</p>
              )}
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha</span>
              <span className="font-medium text-slate-900">
                {quote.fechaCreacion ? formatDate(quote.fechaCreacion) : '—'}
              </span>
            </div>
            {GRUPOS.map((grupo) => (
              <div
                key={grupo.id}
                className={`overflow-hidden rounded-xl border ${grupo.theme.detail}`}
              >
                <div className="flex items-center gap-2 border-b border-inherit px-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${grupo.theme.bar}`} aria-hidden="true" />
                  <p className={`font-semibold ${grupo.theme.detailTitle}`}>{grupo.titulo}</p>
                </div>
                <div className="px-3 py-2">
                  {grupo.campos.map((campo) => (
                    <div key={campo.key} className="flex justify-between py-1">
                      <span className="text-slate-600">{campo.label}</span>
                      <span className="tabular-nums font-medium text-slate-900">
                        {formatMoney(quote[campo.key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-[#0a1926] px-4 py-4 text-white">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Total</span>
              <QuoteTotalBlock
                usdAmount={quote.costoTotalCalculado}
                tipoCambioBob={tipoCambioBob}
                compact
              />
            </div>
          </div>

          <ShareActions
            className="mt-5"
            phone={quote.clienteTelefono}
            email={quote.clienteEmail}
            whatsappText={shareText}
            emailSubject={`Cotización ${vehicleLabel} — ARR-Imports`}
            emailBody={shareText}
          />
        </div>

        <div className="space-y-3 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onEdit} className="app-btn-block inline-flex w-full items-center justify-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button type="button" onClick={onDownload} className="app-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4">
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
            {!quote.clienteId && onConvert && (
              <button type="button" onClick={onConvert} className="app-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4">
                <UserPlus className="h-4 w-4" />
                Convertir en cliente
              </button>
            )}
            <button type="button" onClick={onClose} className="app-btn-secondary inline-flex min-h-11 items-center justify-center px-4">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotesListPanel({ quotes, loading, pagination, onPageChange, onView, onEdit, onDownload, onConvert, onArchive, onNew }) {
  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-base font-medium text-slate-700">No hay cotizaciones registradas</p>
        <p className="mt-1 text-sm text-slate-500">Crea la primera cotización para comenzar.</p>
        <button type="button" onClick={onNew} className="app-btn-block mx-auto mt-6 max-w-xs gap-2">
          <Plus className="h-4 w-4" />
          Nueva cotización
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Vehículo</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((quote) => (
              <tr key={quote.id} className="transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{getQuoteVehicleLabel(quote)}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {quote.clienteNombre ?? '—'}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {quote.fechaCreacion ? formatDate(quote.fechaCreacion) : '—'}
                </td>
                <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                  {formatMoney(quote.costoTotalCalculado)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onView(quote)}
                      title="Ver detalle"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(quote)}
                      title="Editar"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(quote)}
                      title="Descargar PDF"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {!quote.clienteId && (
                      <button
                        type="button"
                        onClick={() => onConvert?.(quote)}
                        title="Convertir en cliente"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onArchive?.(quote)}
                      title="Archivar"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
          <p>
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} cotizaciones
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#00875a] px-5 py-3 text-sm font-medium text-white shadow-lg">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}

/** Gestión de cotizaciones: listar, ver, crear y editar. */
export default function QuotesView() {
  const { tipoCambioBob } = useExchangeRate();
  const [screen, setScreen] = useState('list');
  const [formMode, setFormMode] = useState('create');
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [clientName, setClientName] = useState('');

  const [quotes, setQuotes] = useState([]);
  const [quotesPagination, setQuotesPagination] = useState(null);
  const [quotesPage, setQuotesPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [detailQuote, setDetailQuote] = useState(null);

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(null);
  const [submittingConvert, setSubmittingConvert] = useState(false);
  const [convertModalError, setConvertModalError] = useState('');

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archivingQuote, setArchivingQuote] = useState(null);
  const [submittingArchive, setSubmittingArchive] = useState(false);
  const [archiveModalError, setArchiveModalError] = useState('');

  const vehicleLabel = useMemo(() => buildVehicleLabel(form), [form]);
  const readOnly = formMode === 'view';

  const subtotales = useMemo(() => ({
    precioCompra: num(form.totalVehiculo) + num(form.fees),
    transferenciaUsa: num(form.tarifaUsa),
    comision: num(form.comisionImportador),
    logistica:
      num(form.transporte) +
      num(form.guiaParaRecoger),
    tramites:
      num(form.documentoIngreso) +
      num(form.chaperia) +
      num(form.pintura) +
      num(form.repuestos) +
      num(form.poliza) +
      num(form.tramitesAduana),
  }), [form]);

  const granTotal = useMemo(
    () => NUMERIC_FIELDS.reduce((sum, f) => sum + num(form[f]), 0),
    [form]
  );

  const loadQuotes = useCallback(async (pageToLoad = 1) => {
    setListLoading(true);
    setError('');
    try {
      const response = await api.get('/quotes', {
        params: { page: pageToLoad, limit: 20 },
      });
      if (response.data.success) {
        const { items, pagination } = parseQuotesResponse(response.data.data);
        setQuotes(items);
        setQuotesPagination(pagination);
        setQuotesPage(pageToLoad);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las cotizaciones.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === 'list') {
      loadQuotes(quotesPage);
    }
  }, [screen, loadQuotes, quotesPage]);

  const resetForm = () => {
    setForm({
      ...FORM_INICIAL,
      porcentajeTransferenciaUsa: String(DEFAULT_PORCENTAJE_TRANSFERENCIA),
      tarifaUsa: '0',
      comisionTresPorcento: '0',
    });
    setEditingQuoteId(null);
    setClientName('');
    setFormMode('create');
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setScreen('form');
  };

  const openEdit = (quote) => {
    setDetailQuote(null);
    setForm(quoteToForm(quote));
    setEditingQuoteId(quote.id);
    setClientName(quote.clienteNombre ?? '');
    setFormMode('edit');
    setScreen('form');
    setError('');
  };

  const openView = (quote) => {
    setDetailQuote(quote);
  };

  const handleChange = (e) => {
    if (readOnly) return;
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'totalVehiculo' || name === 'porcentajeTransferenciaUsa') {
        next.tarifaUsa = calcularTransferenciaUsa(
          name === 'totalVehiculo' ? value : next.totalVehiculo,
          name === 'porcentajeTransferenciaUsa' ? value : next.porcentajeTransferenciaUsa
        );
      }
      return next;
    });
  };

  const handleDownloadPdf = async (quoteOverride) => {
    const source = quoteOverride ?? form;
    const total = quoteOverride?.costoTotalCalculado ?? granTotal;
    const name = quoteOverride?.clienteNombre ?? clientName;
    const { downloadQuotePdf } = await import('../utils/exportQuotePdf.js');
    downloadQuotePdf(quoteToForm(source), total, name, tipoCambioBob);
  };

  const openConvertModal = (quote) => {
    setConvertingQuote(quote);
    setConvertModalError('');
    setConvertModalOpen(true);
    setDetailQuote(null);
  };

  const handleConvertToClient = async (formData) => {
    if (!convertingQuote?.id) return;
    setSubmittingConvert(true);
    setConvertModalError('');
    try {
      const response = await api.post(`/quotes/item/${convertingQuote.id}/convert-to-client`, formData);
      if (response.data.success) {
        setConvertModalOpen(false);
        setConvertingQuote(null);
        setToast('Cliente registrado y cotización vinculada.');
        await loadQuotes(quotesPage);
      }
    } catch (err) {
      setConvertModalError(err.response?.data?.message || 'No se pudo convertir la cotización.');
    } finally {
      setSubmittingConvert(false);
    }
  };

  const openArchiveQuoteModal = (quote) => {
    setArchivingQuote(quote);
    setArchiveModalError('');
    setArchiveModalOpen(true);
    setDetailQuote(null);
  };

  const handleArchiveQuote = async ({ motivo }) => {
    if (!archivingQuote?.id) return;
    setSubmittingArchive(true);
    setArchiveModalError('');
    try {
      const response = await api.post(`/quotes/item/${archivingQuote.id}/archive`, { motivo });
      if (response.data.success) {
        setArchiveModalOpen(false);
        setArchivingQuote(null);
        setToast('Cotización archivada.');
        await loadQuotes(quotesPage);
      }
    } catch (err) {
      setArchiveModalError(err.response?.data?.message || 'No se pudo archivar la cotización.');
    } finally {
      setSubmittingArchive(false);
    }
  };

  const handleSave = async () => {
    if (granTotal <= 0) {
      setError('Ingresa al menos un rubro con monto mayor a cero.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = mapFormToPayload(form);

      if (formMode === 'edit' && editingQuoteId) {
        await api.put(`/quotes/item/${editingQuoteId}`, payload);
        setToast('Cotización actualizada correctamente.');
      } else {
        await api.post('/quotes', payload);
        setToast('Cotización guardada correctamente.');
      }

      resetForm();
      setScreen('list');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la cotización.');
    } finally {
      setSaving(false);
    }
  };

  const formTitle =
    formMode === 'edit' ? 'Editar cotización' : formMode === 'view' ? 'Ver cotización' : 'Nueva cotización';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {screen === 'list'
              ? 'Consulta, edita y descarga las cotizaciones registradas.'
              : 'Completa el desglose de costos y guarda la cotización.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {screen === 'list' ? (
            <button type="button" onClick={openCreate} className="app-btn-block gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Nueva cotización
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setScreen('list');
              }}
              className="app-btn-secondary gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver cotizaciones
            </button>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <ExchangeRateControl variant="light" />
      </div>

      {error && <div role="alert" className="app-alert-error">{error}</div>}

      {screen === 'list' ? (
        <QuotesListPanel
          quotes={quotes}
          loading={listLoading}
          pagination={quotesPagination}
          onPageChange={setQuotesPage}
          onView={openView}
          onEdit={openEdit}
          onDownload={handleDownloadPdf}
          onConvert={openConvertModal}
          onArchive={openArchiveQuoteModal}
          onNew={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{formTitle}</h2>
              {clientName && (
                <p className="mt-0.5 text-sm text-emerald-700">Cliente: {clientName}</p>
              )}
            </div>

            {GRUPOS.map((grupo) => (
              <QuoteGroupCard
                key={grupo.id}
                grupo={grupo}
                form={form}
                onChange={handleChange}
                disabled={saving}
                readOnly={readOnly}
                showVehicleFields={grupo.id === 'origen'}
              />
            ))}
          </div>

          <div className="md:col-span-1">
            <FinancialSummary
              subtotales={subtotales}
              granTotal={granTotal}
              vehicleLabel={vehicleLabel}
              clientName={clientName}
              tipoCambioBob={tipoCambioBob}
              onDownload={() => handleDownloadPdf()}
              onSave={handleSave}
              saving={saving}
              canSave={granTotal > 0}
              formMode={formMode}
              readOnly={readOnly}
            />
          </div>
        </div>
      )}

      <QuoteDetailModal
        quote={detailQuote}
        tipoCambioBob={tipoCambioBob}
        onClose={() => setDetailQuote(null)}
        onEdit={() => {
          openEdit(detailQuote);
        }}
        onDownload={() => handleDownloadPdf(detailQuote)}
        onConvert={() => openConvertModal(detailQuote)}
      />

      <ConvertQuoteModal
        open={convertModalOpen}
        quote={convertingQuote}
        onClose={() => { setConvertModalOpen(false); setConvertingQuote(null); }}
        onSubmit={handleConvertToClient}
        submitting={submittingConvert}
        error={convertModalError}
      />

      <ArchiveQuoteModal
        open={archiveModalOpen}
        quote={archivingQuote}
        onClose={() => { setArchiveModalOpen(false); setArchivingQuote(null); }}
        onSubmit={handleArchiveQuote}
        submitting={submittingArchive}
        error={archiveModalError}
      />

      {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
