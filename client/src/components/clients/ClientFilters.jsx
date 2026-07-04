import { Filter, Search, X } from 'lucide-react';

import { ESTADOS_OPCIONES } from './clientConstants.js';

export default function ClientFilters({
  search,
  onSearchChange,
  estado,
  onEstadoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  onClear,
  hasActiveFilters,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Filtros de búsqueda</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-1">
          <label htmlFor="client-search" className="mb-1.5 block text-sm font-medium text-slate-700">
            Buscar
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="client-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nombre, teléfono, VIN, lote..."
              className="app-input !mt-0 w-full !pl-10 !pr-4 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="client-estado" className="mb-1.5 block text-sm font-medium text-slate-700">
            Estado del vehículo
          </label>
          <select
            id="client-estado"
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value)}
            className="app-input !mt-0 w-full"
          >
            <option value="">Todos</option>
            {ESTADOS_OPCIONES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fecha-desde" className="mb-1.5 block text-sm font-medium text-slate-700">
            Registro desde
          </label>
          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            className="app-input !mt-0 w-full"
          />
        </div>

        <div>
          <label htmlFor="fecha-hasta" className="mb-1.5 block text-sm font-medium text-slate-700">
            Registro hasta
          </label>
          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            className="app-input !mt-0 w-full"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  );
}
