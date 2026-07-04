import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, UserPlus, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import api from '../services/api.js';
import { downloadCsvExport } from '../utils/exportCsv.js';
import { linkPhotosToClient, uploadVehiclePhotos } from '../services/uploadPhotos.js';
import { parseClientsResponse, summariesMapFromClients } from '../utils/paymentSummaries.js';
import { ESTADO_CONFIG } from './clients/clientConstants.js';
import ArchiveClientModal from './clients/ArchiveClientModal.jsx';
import ClientFilters from './clients/ClientFilters.jsx';
import ClientListPanel from './clients/ClientListPanel.jsx';
import ClientTimelineModal from './clients/ClientTimelineModal.jsx';
import RegisterClientModal from './clients/RegisterClientModal.jsx';

function sortByRecentRegistration(clients) {
  return [...clients].sort((a, b) => {
    const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
    const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
    return dateB - dateA;
  });
}

const CLIENTS_PAGE_SIZE = 50;

export default function ClientManagementView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const estadoFromUrl = searchParams.get('estado')?.toUpperCase() ?? '';
  const estadoLabel = ESTADO_CONFIG[estadoFromUrl]?.label ?? null;

  const [clients, setClients] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(estadoFromUrl);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientModalMode, setClientModalMode] = useState('create');
  const [editingClient, setEditingClient] = useState(null);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState('');

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archivingClient, setArchivingClient] = useState(null);
  const [submittingArchive, setSubmittingArchive] = useState(false);
  const [archiveModalError, setArchiveModalError] = useState('');

  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineClient, setTimelineClient] = useState(null);
  const [timelineItems, setTimelineItems] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    setEstadoFilter(estadoFromUrl);
  }, [estadoFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, estadoFilter, fechaDesde, fechaHasta]);

  const hasActiveFilters = useMemo(
    () => Boolean(debouncedSearch || estadoFilter || fechaDesde || fechaHasta),
    [debouncedSearch, estadoFilter, fechaDesde, fechaHasta]
  );

  const buildFilterParams = useCallback(
    () => ({
      includeFinanciero: true,
      page,
      limit: CLIENTS_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(estadoFilter ? { estado: estadoFilter } : {}),
      ...(fechaDesde ? { fechaDesde } : {}),
      ...(fechaHasta ? { fechaHasta } : {}),
    }),
    [page, debouncedSearch, estadoFilter, fechaDesde, fechaHasta]
  );

  const loadClients = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/clients', { params: buildFilterParams() });
      if (response.data.success) {
        const { items, pagination: meta } = parseClientsResponse(response.data.data);
        const list = sortByRecentRegistration(items);
        setClients(list);
        setPagination(meta);
        setSummaries(summariesMapFromClients(list));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    setLoading(true);
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const clearEstadoFilter = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('estado');
      return next;
    });
    setEstadoFilter('');
  };

  const clearAllFilters = () => {
    setSearch('');
    setFechaDesde('');
    setFechaHasta('');
    clearEstadoFilter();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const { page: _page, limit: _limit, includeFinanciero: _inc, ...exportParams } = buildFilterParams();
      await downloadCsvExport('/clients/export.csv', 'clientes-arr-imports.csv', exportParams);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo exportar el listado.');
    } finally {
      setExporting(false);
    }
  };

  const refreshClientData = async (clientId) => {
    await loadClients();
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

  const openCreateModal = () => {
    setClientModalMode('create');
    setEditingClient(null);
    setClientModalError('');
    setClientModalOpen(true);
  };

  const openEditModal = (client) => {
    setClientModalMode('edit');
    setEditingClient(client);
    setClientModalError('');
    setClientModalOpen(true);
  };

  const handleUpdateClient = async (formData) => {
    if (!editingClient?.id) return;
    setSubmittingClient(true);
    setClientModalError('');
    try {
      const { photoFiles: _photos, estadoAuto: _estado, ...fields } = formData;
      const response = await api.patch(`/clients/${editingClient.id}`, {
        ...fields,
        vehiculo: fields.vehiculo || undefined,
      });
      if (response.data.success) {
        setClientModalOpen(false);
        setEditingClient(null);
        setSuccess('Cliente actualizado correctamente.');
        await refreshClientData(editingClient.id);
      }
    } catch (err) {
      setClientModalError(err.response?.data?.message || 'No se pudo actualizar el cliente.');
    } finally {
      setSubmittingClient(false);
    }
  };

  const openArchiveModal = (client) => {
    setArchivingClient(client);
    setArchiveModalError('');
    setArchiveModalOpen(true);
  };

  const handleArchiveClient = async ({ motivo, forzar }) => {
    if (!archivingClient?.id) return;
    setSubmittingArchive(true);
    setArchiveModalError('');
    try {
      const response = await api.post(`/clients/${archivingClient.id}/archive`, { motivo, forzar });
      if (response.data.success) {
        setArchiveModalOpen(false);
        setArchivingClient(null);
        setSuccess('Cliente archivado correctamente.');
        await loadClients();
      }
    } catch (err) {
      setArchiveModalError(err.response?.data?.message || 'No se pudo archivar el cliente.');
    } finally {
      setSubmittingArchive(false);
    }
  };

  const openTimelineModal = async (client) => {
    setTimelineClient(client);
    setTimelineModalOpen(true);
    setTimelineLoading(true);
    setTimelineItems([]);
    try {
      const response = await api.get(`/clients/${client.id}/timeline`);
      if (response.data.success) {
        setTimelineItems(response.data.data.historial ?? []);
      }
    } catch {
      setError('No se pudo cargar el historial de estados.');
    } finally {
      setTimelineLoading(false);
    }
  };

  if (loading && clients.length === 0) {
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
            Busca, filtra y exporta clientes con su estado logístico y saldo pendiente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="app-btn-secondary gap-2 px-4"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="app-btn-primary gap-2 px-4 sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Registrar Cliente
          </button>
        </div>
      </div>

      {error && <div role="alert" className="app-alert-error">{error}</div>}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <ClientFilters
        search={search}
        onSearchChange={setSearch}
        estado={estadoFilter}
        onEstadoChange={(value) => {
          setEstadoFilter(value);
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            if (value) next.set('estado', value);
            else next.delete('estado');
            return next;
          });
        }}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        onClear={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {estadoLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p>
            Filtrando vehículos en estado:{' '}
            <span className="font-semibold">{estadoLabel}</span>
            {' '}({pagination?.total ?? clients.length})
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
        clients={clients}
        summaries={summaries}
        onStatusUpdate={handleStatusUpdate}
        onEdit={openEditModal}
        onTimeline={openTimelineModal}
        onArchive={openArchiveModal}
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
              onClick={() => setPage((p) => p - 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <RegisterClientModal
        open={clientModalOpen}
        mode={clientModalMode}
        client={editingClient}
        onClose={() => { setClientModalOpen(false); setEditingClient(null); }}
        onSubmit={clientModalMode === 'edit' ? handleUpdateClient : handleRegisterClient}
        submitting={submittingClient}
        error={clientModalError}
      />

      <ArchiveClientModal
        open={archiveModalOpen}
        client={archivingClient}
        saldoPendiente={archivingClient ? summaries[archivingClient.id]?.resumenFinanciero?.saldoPendiente ?? 0 : 0}
        onClose={() => { setArchiveModalOpen(false); setArchivingClient(null); }}
        onSubmit={handleArchiveClient}
        submitting={submittingArchive}
        error={archiveModalError}
      />

      <ClientTimelineModal
        open={timelineModalOpen}
        client={timelineClient}
        historial={timelineItems}
        loading={timelineLoading}
        onClose={() => { setTimelineModalOpen(false); setTimelineClient(null); }}
      />
    </div>
  );
}
