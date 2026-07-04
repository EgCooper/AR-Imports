import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import api from '../services/api.js';
import { linkPhotosToClient, uploadVehiclePhotos } from '../services/uploadPhotos.js';
import { parseClientsResponse, summariesMapFromClients } from '../utils/paymentSummaries.js';
import { ESTADO_CONFIG } from './clients/clientConstants.js';
import ClientListPanel from './clients/ClientListPanel.jsx';
import RegisterClientModal from './clients/RegisterClientModal.jsx';

function sortByRecentRegistration(clients) {
  return [...clients].sort((a, b) => {
    const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
    const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
    return dateB - dateA;
  });
}

const CLIENTS_PAGE_SIZE = 50;

/**
 * Vista principal de gestión de clientes — listado completo de últimos registrados.
 */
export default function ClientManagementView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const estadoFilter = searchParams.get('estado')?.toUpperCase() ?? '';
  const estadoLabel = ESTADO_CONFIG[estadoFilter]?.label ?? null;

  const [clients, setClients] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState('');

  const fetchSummariesForClients = (list) => {
    setSummaries(summariesMapFromClients(list));
  };

  const loadClients = useCallback(async (pageToLoad = 1) => {
    setError('');
    try {
      const params = {
        includeFinanciero: true,
        page: pageToLoad,
        limit: CLIENTS_PAGE_SIZE,
      };
      if (estadoFilter && ESTADO_CONFIG[estadoFilter]) {
        params.estado = estadoFilter;
      }

      const response = await api.get('/clients', { params });
      if (response.data.success) {
        const { items, pagination: meta } = parseClientsResponse(response.data.data);
        const list = sortByRecentRegistration(items);
        setClients(list);
        setPagination(meta);
        setPage(pageToLoad);
        fetchSummariesForClients(list);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  useEffect(() => {
    setLoading(true);
    loadClients(1);
  }, [loadClients]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredClients = clients;

  const clearEstadoFilter = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('estado');
      return next;
    });
  };

  const refreshClientData = async (clientId) => {
    await loadClients(page);
    if (clientId) {
      try {
        const summaryRes = await api.get(`/payments/summary/${clientId}`);
        if (summaryRes.data.success) {
          setSummaries((prev) => ({ ...prev, [clientId]: summaryRes.data.data }));
        }
      } catch {
        const client = clients.find((c) => c.id === clientId);
        setSummaries((prev) => ({
          ...prev,
          [clientId]: {
            resumenFinanciero: {
              costoTotalPactado: client?.costoTotalPactado ?? 0,
              totalPagado: 0,
              saldoPendiente: client?.costoTotalPactado ?? 0,
            },
            historialAbonos: [],
          },
        }));
      }
    }
  };

  const handleStatusUpdate = async (clientId, nuevoEstado) => {
    const previous = clients.find((c) => c.id === clientId)?.estadoAuto;
    setClients((current) =>
      current.map((c) => (c.id === clientId ? { ...c, estadoAuto: nuevoEstado } : c))
    );

    try {
      const response = await api.patch(`/clients/${clientId}/status`, { estadoAuto: nuevoEstado });
      if (!response.data.success) throw new Error();
    } catch {
      setClients((current) =>
        current.map((c) => (c.id === clientId ? { ...c, estadoAuto: previous } : c))
      );
      setError('No se pudo actualizar el estado del vehículo.');
    }
  };

  const handleRegisterClient = async (formData) => {
    setSubmittingClient(true);
    setClientModalError('');
    try {
      const { photoFiles = [], ...clientFields } = formData;
      let fotoUrls = [];

      if (photoFiles.length > 0) {
        fotoUrls = await uploadVehiclePhotos(photoFiles);
      }

      const response = await api.post('/clients', {
        ...clientFields,
        fotoAutoUrl: fotoUrls[0] || undefined,
        vehiculo: clientFields.vehiculo || undefined,
      });

      if (response.data.success) {
        const newId = response.data.data.id;
        if (fotoUrls.length > 0) {
          await linkPhotosToClient(newId, fotoUrls, clientFields.estadoAuto);
        }
        setClientModalOpen(false);
        setSuccess('Cliente registrado correctamente.');
        await refreshClientData(newId);
      }
    } catch (err) {
      setClientModalError(err.response?.data?.message || err.message || 'Error al registrar el cliente.');
    } finally {
      setSubmittingClient(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Cargando clientes" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Últimos registrados, estado logístico y saldo pendiente de cada vehículo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setClientModalError(''); setClientModalOpen(true); }}
          className="app-btn-primary gap-2 px-4 sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Cliente
        </button>
      </div>

      {error && <div role="alert" className="app-alert-error">{error}</div>}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {estadoLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p>
            Filtrando vehículos en estado:{' '}
            <span className="font-semibold">{estadoLabel}</span>
            {' '}({pagination?.total ?? filteredClients.length})
          </p>
          <button
            type="button"
            onClick={clearEstadoFilter}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
            Quitar filtro
          </button>
        </div>
      )}

      <ClientListPanel
        clients={filteredClients}
        summaries={summaries}
        onStatusUpdate={handleStatusUpdate}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p>
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} clientes
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadClients(pagination.page - 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadClients(pagination.page + 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <RegisterClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSubmit={handleRegisterClient}
        submitting={submittingClient}
        error={clientModalError}
      />
    </div>
  );
}
