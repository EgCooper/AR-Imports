import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';

import api from '../services/api.js';
import { linkPhotosToClient, uploadVehiclePhotos } from '../services/uploadPhotos.js';
import ClientListPanel from './clients/ClientListPanel.jsx';
import RegisterClientModal from './clients/RegisterClientModal.jsx';

function sortByRecentRegistration(clients) {
  return [...clients].sort((a, b) => {
    const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
    const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Vista principal de gestión de clientes — listado completo de últimos registrados.
 */
export default function ClientManagementView() {
  const [clients, setClients] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState('');

  const fetchSummariesForClients = async (list) => {
    const summaryResults = await Promise.allSettled(
      list.map((c) => api.get(`/payments/summary/${c.id}`))
    );

    const nextSummaries = {};
    summaryResults.forEach((result, index) => {
      const client = list[index];
      if (result.status === 'fulfilled' && result.value.data.success) {
        nextSummaries[client.id] = result.value.data.data;
      } else {
        nextSummaries[client.id] = {
          resumenFinanciero: {
            costoTotalPactado: client.costoTotalPactado ?? 0,
            totalPagado: 0,
            saldoPendiente: client.costoTotalPactado ?? 0,
          },
          historialAbonos: [],
        };
      }
    });
    setSummaries(nextSummaries);
  };

  const loadClients = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/clients');
      if (response.data.success) {
        const list = sortByRecentRegistration(response.data.data);
        setClients(list);
        await fetchSummariesForClients(list);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const refreshClientData = async (clientId) => {
    const response = await api.get('/clients');
    if (response.data.success) {
      const list = sortByRecentRegistration(response.data.data);
      setClients(list);
      if (clientId) {
        const client = list.find((c) => c.id === clientId);
        try {
          const summaryRes = await api.get(`/payments/summary/${clientId}`);
          if (summaryRes.data.success) {
            setSummaries((prev) => ({ ...prev, [clientId]: summaryRes.data.data }));
          }
        } catch {
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
      } else {
        await fetchSummariesForClients(list);
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

      <ClientListPanel
        clients={clients}
        summaries={summaries}
        onStatusUpdate={handleStatusUpdate}
      />

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
