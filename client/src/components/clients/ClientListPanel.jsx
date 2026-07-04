import { useState } from 'react';
import { Archive, Clock, Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ESTADO_CONFIG, ESTADOS_OPCIONES, formatMoney, getVehicleLabel } from './clientConstants.js';

function StatusSelect({ clientId, estadoAuto, onUpdate, updating }) {
  return (
    <select
      value={estadoAuto}
      disabled={updating}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onUpdate(clientId, e.target.value)}
      className="min-h-10 w-full min-w-[130px] max-w-[160px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-wait disabled:opacity-60"
      aria-label="Cambiar estado del vehículo"
    >
      {ESTADOS_OPCIONES.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function ClientListPanel({
  clients,
  summaries,
  onStatusUpdate,
  onEdit,
  onTimeline,
  onArchive,
}) {
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState('');

  const handleStatusChange = async (clientId, nuevoEstado) => {
    setUpdatingId(clientId);
    try {
      await onStatusUpdate(clientId, nuevoEstado);
    } finally {
      setUpdatingId('');
    }
  };

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <p className="text-base font-medium text-slate-700">No hay clientes registrados</p>
        <p className="mt-1 text-sm text-slate-500">Registra el primer cliente para comenzar.</p>
      </div>
    );
  }

  const ActionButtons = ({ client, compact = false }) => (
    <div className={`flex ${compact ? 'flex-wrap' : 'items-center justify-end'} gap-1`}>
      <button type="button" onClick={() => onEdit?.(client)} title="Editar" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onTimeline?.(client)} title="Historial" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
        <Clock className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onArchive?.(client)} title="Archivar" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700">
        <Archive className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => navigate(`/pagos?cliente=${client.id}`)}
        title="Ver pagos"
        className={compact
          ? 'inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#00875a] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700'
          : 'rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
      >
        <Eye className="h-4 w-4" />
        {compact && 'Ver pagos'}
      </button>
    </div>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">Clientes</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} en esta página
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Vehículo</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Saldo pendiente</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => {
              const saldo = summaries[client.id]?.resumenFinanciero?.saldoPendiente ?? null;
              return (
                <tr key={client.id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{client.nombreCompleto}</p>
                    {client.telefono && <p className="mt-0.5 text-xs text-slate-500">{client.telefono}</p>}
                  </td>
                  <td className="max-w-[220px] px-6 py-4 text-slate-600">
                    <p className="truncate">{getVehicleLabel(client, summaries[client.id])}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusSelect clientId={client.id} estadoAuto={client.estadoAuto} onUpdate={handleStatusChange} updating={updatingId === client.id} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold tabular-nums ${saldo > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                      {saldo === null ? '—' : saldo > 0 ? formatMoney(saldo) : 'Liquidado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ActionButtons client={client} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 lg:hidden">
        {clients.map((client) => {
          const saldo = summaries[client.id]?.resumenFinanciero?.saldoPendiente ?? null;
          const badge = ESTADO_CONFIG[client.estadoAuto]?.badge;
          return (
            <li key={client.id} className="px-4 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{client.nombreCompleto}</p>
                  <p className="mt-1 truncate text-sm text-slate-600">{getVehicleLabel(client, summaries[client.id])}</p>
                </div>
                {badge && <span className={badge}>{ESTADO_CONFIG[client.estadoAuto]?.label}</span>}
              </div>
              <div className="mt-4 space-y-3">
                <StatusSelect clientId={client.id} estadoAuto={client.estadoAuto} onUpdate={handleStatusChange} updating={updatingId === client.id} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Saldo pendiente</p>
                    <p className={`mt-0.5 text-base font-semibold tabular-nums ${saldo > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                      {saldo === null ? '—' : saldo > 0 ? formatMoney(saldo) : 'Liquidado'}
                    </p>
                  </div>
                  <ActionButtons client={client} compact />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
