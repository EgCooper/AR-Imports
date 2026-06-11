import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';

import api from '../services/api.js';

const ESTADOS = ['USA', 'CHILE', 'ADUANA_BOLIVIA', 'TALLER'];

const ESTADO_CONFIG = {
  USA: { label: 'USA', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  CHILE: { label: 'Chile', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  ADUANA_BOLIVIA: { label: 'Aduana Bolivia', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  TALLER: { label: 'Taller', badge: 'bg-green-100 text-green-800 border-green-200' },
};

const FORM_INICIAL = {
  nombreCompleto: '',
  telefono: '',
  vin: '',
  lote: '',
  fotoAutoUrl: '',
  costoTotalPactado: '',
};

/** Etiqueta de color según el estado logístico del vehículo. */
function StatusBadge({ estado }) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold sm:text-sm ${config.badge}`}
    >
      {config.label}
    </span>
  );
}

/** Selector táctil para cambiar el estado del auto al instante. */
function StatusSelect({ clientId, estadoAuto, onUpdate, disabled }) {
  return (
    <select
      value={estadoAuto}
      disabled={disabled}
      onChange={(e) => onUpdate(clientId, e.target.value)}
      className="min-h-11 w-full min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Cambiar estado del vehículo"
    >
      {ESTADOS.map((estado) => (
        <option key={estado} value={estado}>
          {ESTADO_CONFIG[estado].label}
        </option>
      ))}
    </select>
  );
}

/** Modal flotante para registrar un nuevo cliente. */
function NewClientModal({ open, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    if (open) setForm(FORM_INICIAL);
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      costoTotalPactado: Number(form.costoTotalPactado),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo Cliente</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5">
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="nombreCompleto" className="block text-sm font-medium text-slate-700">
                Nombre completo *
              </label>
              <input
                id="nombreCompleto"
                name="nombreCompleto"
                required
                value={form.nombreCompleto}
                onChange={handleChange}
                className="app-input"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-slate-700">
                Teléfono *
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                required
                value={form.telefono}
                onChange={handleChange}
                className="app-input"
                placeholder="70123456"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vin" className="block text-sm font-medium text-slate-700">
                  VIN *
                </label>
                <input
                  id="vin"
                  name="vin"
                  required
                  value={form.vin}
                  onChange={handleChange}
                  className="app-input"
                  placeholder="1HGBH41JXMN109186"
                />
              </div>
              <div>
                <label htmlFor="lote" className="block text-sm font-medium text-slate-700">
                  Lote *
                </label>
                <input
                  id="lote"
                  name="lote"
                  required
                  value={form.lote}
                  onChange={handleChange}
                  className="app-input"
                  placeholder="L-001"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fotoAutoUrl" className="block text-sm font-medium text-slate-700">
                URL foto del auto
              </label>
              <input
                id="fotoAutoUrl"
                name="fotoAutoUrl"
                type="url"
                value={form.fotoAutoUrl}
                onChange={handleChange}
                className="app-input"
                placeholder="https://..."
              />
            </div>

            <div>
              <label htmlFor="costoTotalPactado" className="block text-sm font-medium text-slate-700">
                Costo total pactado (USD) *
              </label>
              <input
                id="costoTotalPactado"
                name="costoTotalPactado"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.costoTotalPactado}
                onChange={handleChange}
                className="app-input"
                placeholder="15000"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="app-btn-block sm:w-auto sm:min-w-[140px]"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : (
                'Registrar cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Tarjeta móvil con datos del cliente y acciones táctiles. */
function ClientCard({ client, onStatusChange, updatingId }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-900">{client.nombreCompleto}</h3>
          <p className="mt-1 text-sm text-slate-500">{client.telefono}</p>
        </div>
        <StatusBadge estado={client.estadoAuto} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">VIN</dt>
          <dd className="truncate font-medium text-slate-900">{client.vin}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Lote</dt>
          <dd className="font-medium text-slate-900">{client.lote}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Costo pactado</dt>
          <dd className="font-medium text-slate-900">
            ${Number(client.costoTotalPactado).toLocaleString('en-US')}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Cambiar estado
        </p>
        <StatusSelect
          clientId={client.id}
          estadoAuto={client.estadoAuto}
          onUpdate={onStatusChange}
          disabled={updatingId === client.id}
        />
      </div>
    </article>
  );
}

/** Vista principal de gestión de clientes. */
export default function ClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchClients = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      [client.nombreCompleto, client.lote, client.vin]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term))
    );
  }, [clients, search]);

  const handleCreateClient = async (formData) => {
    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        ...formData,
        fotoAutoUrl: formData.fotoAutoUrl || undefined,
      };

      const response = await api.post('/clients', payload);

      if (response.data.success) {
        setModalOpen(false);
        await fetchClients();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al registrar el cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (clientId, nuevoEstado) => {
    const prevClients = clients;
    setUpdatingId(clientId);

    setClients((current) =>
      current.map((c) => (c.id === clientId ? { ...c, estadoAuto: nuevoEstado } : c))
    );

    try {
      const response = await api.patch(`/clients/${clientId}/status`, {
        estadoAuto: nuevoEstado,
      });

      if (!response.data.success) {
        setClients(prevClients);
      }
    } catch {
      setClients(prevClients);
      setError('No se pudo actualizar el estado. Intenta de nuevo.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} registrado
            {filteredClients.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError('');
            setModalOpen(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, lote o VIN..."
          className="app-input !mt-0 pl-10"
          aria-label="Buscar clientes"
        />
      </div>

      {/* Errores globales */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Carga */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando clientes" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="app-card text-center">
          <p className="text-sm text-slate-500 sm:text-base">
            {search ? 'No se encontraron clientes con ese criterio.' : 'Aún no hay clientes registrados.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla — escritorio */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3.5">Nombre</th>
                    <th className="px-5 py-3.5">Teléfono</th>
                    <th className="px-5 py-3.5">VIN / Lote</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-medium text-slate-900">{client.nombreCompleto}</td>
                      <td className="px-5 py-4 text-slate-600">{client.telefono}</td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-slate-900">{client.vin}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Lote: {client.lote}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge estado={client.estadoAuto} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusSelect
                          clientId={client.id}
                          estadoAuto={client.estadoAuto}
                          onUpdate={handleStatusChange}
                          disabled={updatingId === client.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjetas — móvil / tablet pequeña */}
          <div className="grid gap-4 md:hidden">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onStatusChange={handleStatusChange}
                updatingId={updatingId}
              />
            ))}
          </div>
        </>
      )}

      <NewClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateClient}
        submitting={submitting}
        error={modalError}
      />
    </div>
  );
}
