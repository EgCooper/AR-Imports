import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Loader2,
  Search,
  TrendingDown,
  Wallet,
} from 'lucide-react';

import api from '../services/api.js';
import { uploadComprobantePhoto } from '../services/uploadPhotos.js';
import { parseClientsResponse, summariesMapFromClients } from '../utils/paymentSummaries.js';
import PaymentHistoryPanel from './clients/PaymentHistoryPanel.jsx';
import RegisterPaymentModal from './clients/RegisterPaymentModal.jsx';
import { formatMoney, getVehicleLabel } from './clients/clientConstants.js';

function ClientSelector({
  clients,
  selectedId,
  onSelect,
  loading,
  search,
  onSearchChange,
  searchLoading,
}) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-slate-700">Seleccionar cliente registrado</label>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-slate-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-60"
      >
        <span className={selected ? 'font-medium text-slate-900' : 'text-slate-500'}>
          {loading
            ? 'Cargando clientes...'
            : selected
              ? `${selected.nombreCompleto} · Lote ${selected.lote}`
              : 'Busca y selecciona un cliente'}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Cerrar selector" className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar por nombre, lote o VIN..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  autoFocus
                />
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {searchLoading ? (
                <li className="flex items-center justify-center px-4 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </li>
              ) : clients.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">Sin resultados</li>
              ) : (
                clients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(client.id);
                        setOpen(false);
                        onSearchChange('');
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                        client.id === selectedId ? 'bg-emerald-50 font-medium' : ''
                      }`}
                    >
                      <p className="font-medium text-slate-900">{client.nombreCompleto}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Lote {client.lote} · VIN {client.vin}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function FinancialKPIs({ resumen }) {
  const { costoTotalPactado, totalPagado, saldoPendiente } = resumen;
  const liquidado = saldoPendiente <= 0;

  const cards = [
    {
      label: 'Costo pactado',
      value: formatMoney(costoTotalPactado),
      icon: DollarSign,
      className: 'border-slate-200 bg-white text-slate-900',
      iconClass: 'bg-slate-100 text-slate-600',
      labelClass: 'text-slate-500',
    },
    {
      label: 'Total abonado',
      value: formatMoney(totalPagado),
      icon: Wallet,
      className: 'border-slate-200 bg-white text-slate-900',
      iconClass: 'bg-emerald-50 text-emerald-700',
      labelClass: 'text-slate-500',
    },
    {
      label: liquidado ? 'Cuenta liquidada' : 'Saldo pendiente',
      value: liquidado ? 'Liquidado' : formatMoney(saldoPendiente),
      icon: liquidado ? CheckCircle2 : TrendingDown,
      className: 'border-[#0a1926] bg-[#0a1926] text-white',
      iconClass: 'bg-white/15 text-white',
      labelClass: 'text-white/70',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.className}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${card.labelClass ?? 'text-slate-500'}`}>
                {card.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{card.value}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SelectedClientBanner({ client, summary }) {
  if (!client) return null;

  const saldo = summary?.resumenFinanciero?.saldoPendiente ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente seleccionado</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{client.nombreCompleto}</p>
          <p className="mt-0.5 text-sm text-slate-500">{getVehicleLabel(client, summary)}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saldo pendiente</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${saldo > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
            {saldo > 0 ? formatMoney(saldo) : 'Liquidado'}
          </p>
        </div>
      </div>
    </div>
  );
}


const CLIENTS_PAGE_SIZE = 50;

export default function PaymentsView() {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsPagination, setClientsPagination] = useState(null);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState('');

  const clienteFromUrl = searchParams.get('cliente');

  const selectedClient =
    clients.find((c) => c.id === selectedClientId) ?? selectedClientDetail;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(clientSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    setClientsPage(1);
  }, [debouncedSearch]);

  const fetchClients = useCallback(async (pageToLoad = 1, searchTerm = debouncedSearch) => {
    setClientsLoading(true);
    try {
      const params = {
        includeFinanciero: true,
        page: pageToLoad,
        limit: CLIENTS_PAGE_SIZE,
      };
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/clients', { params });
      if (response.data.success) {
        const { items, pagination } = parseClientsResponse(response.data.data);
        setClients(items);
        setClientsPagination(pagination);
        setClientsPage(pageToLoad);
        setSummaries((prev) => ({ ...prev, ...summariesMapFromClients(items) }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes.');
    } finally {
      setClientsLoading(false);
    }
  }, [debouncedSearch]);

  const fetchSummary = useCallback(async (clientId) => {
    if (!clientId) return;
    setSummaryLoading(true);
    setError('');
    try {
      const response = await api.get(`/payments/summary/${clientId}`);
      if (response.data.success) {
        setSummary(response.data.data);
        setSummaries((prev) => ({ ...prev, [clientId]: response.data.data }));
      }
    } catch (err) {
      setSummary(null);
      setError(err.response?.data?.message || 'No se pudo cargar el estado de cuenta.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(clientsPage, debouncedSearch);
  }, [fetchClients, clientsPage, debouncedSearch]);

  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientDetail(null);
      return;
    }

    const inList = clients.find((c) => c.id === selectedClientId);
    if (inList) {
      setSelectedClientDetail(inList);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(`/clients/${selectedClientId}`);
        if (!cancelled && response.data.success) {
          setSelectedClientDetail(response.data.data);
        }
      } catch {
        if (!cancelled) setSelectedClientDetail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (!clienteFromUrl || clientsLoading) return;
    setSelectedClientId(clienteFromUrl);
  }, [clienteFromUrl, clientsLoading]);

  useEffect(() => {
    if (selectedClientId) fetchSummary(selectedClientId);
    else setSummary(null);
  }, [selectedClientId, fetchSummary]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleRegisterPayment = async (formData) => {
    setSubmittingPayment(true);
    setPaymentModalError('');
    try {
      let comprobanteUrl;
      if (formData.comprobanteFile) {
        comprobanteUrl = await uploadComprobantePhoto(formData.comprobanteFile);
      }

      const response = await api.post('/payments', {
        clienteId: formData.clienteId,
        monto: formData.monto,
        fechaAbono: formData.fechaAbono,
        concepto: formData.concepto,
        metodoPago: formData.metodoPago,
        comprobanteUrl,
        notas: formData.notas,
      });
      if (response.data.success) {
        setPaymentModalOpen(false);
        setSuccess('Pago registrado correctamente.');
        const targetId = formData.clienteId;
        if (targetId === selectedClientId || !selectedClientId) {
          setSelectedClientId(targetId);
        }
        await fetchSummary(targetId);
        await fetchClients(clientsPage, debouncedSearch);
      }
    } catch (err) {
      setPaymentModalError(err.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentModalError('');
    setPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta saldos, historial de abonos y registra pagos de clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={openPaymentModal}
          className="app-btn-primary gap-2 px-4 sm:w-auto"
        >
          <CreditCard className="h-4 w-4" />
          Registrar Pago
        </button>
      </div>

      {error && <div role="alert" className="app-alert-error">{error}</div>}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <ClientSelector
        clients={clients}
        selectedId={selectedClientId}
        onSelect={setSelectedClientId}
        loading={clientsLoading}
        search={clientSearch}
        onSearchChange={setClientSearch}
        searchLoading={clientsLoading && clientSearch !== debouncedSearch}
      />

      {clientsPagination && clientsPagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p>
            Página {clientsPagination.page} de {clientsPagination.totalPages} · {clientsPagination.total} clientes
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={clientsPagination.page <= 1 || clientsLoading}
              onClick={() => setClientsPage((p) => p - 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={clientsPagination.page >= clientsPagination.totalPages || clientsLoading}
              onClick={() => setClientsPage((p) => p + 1)}
              className="app-btn-secondary min-h-10 px-3 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {!selectedClientId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Wallet className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-base font-medium text-slate-700">Selecciona un cliente</p>
          <p className="mt-1 text-sm text-slate-500">
            Elige un cliente registrado para ver su resumen financiero e historial de pagos.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <SelectedClientBanner client={selectedClient} summary={summary} />

          {summary?.resumenFinanciero && (
            <FinancialKPIs resumen={summary.resumenFinanciero} />
          )}

          <PaymentHistoryPanel
            historial={summary?.historialAbonos}
            loading={summaryLoading}
          />
        </div>
      )}

      <RegisterPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        clients={clients}
        summaries={summaries}
        initialClientId={selectedClientId}
        onSubmit={handleRegisterPayment}
        submitting={submittingPayment}
        error={paymentModalError}
      />
    </div>
  );
}
