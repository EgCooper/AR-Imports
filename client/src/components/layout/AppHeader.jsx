import PageContainer from './PageContainer.jsx';

export default function AppHeader({ title, subtitle = 'AR-Imports', user, onLogout, actions }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <PageContainer className="py-4 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 sm:text-sm">
              {subtitle}
            </p>
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
              {title}
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:shrink-0">
            {actions}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {user?.nombre && (
                <span className="truncate text-sm text-slate-600">
                  Hola, <span className="font-medium">{user.nombre}</span>
                </span>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto sm:py-1.5"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
