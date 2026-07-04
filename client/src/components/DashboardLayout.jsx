import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, FileText, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';

import { BRAND_LOGO_MARK, BRAND_NAME } from '../constants/brand.js';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
];

function SidebarLink({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#00875a] text-white shadow-sm'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        ].join(' ')
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarContent({ user, onLogout, onNavigate }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <span className="text-sm font-bold">{BRAND_LOGO_MARK}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{BRAND_NAME}</p>
            {user?.nombre && (
              <p className="truncate text-xs text-slate-400">{user.nombre}</p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const currentPage =
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Dashboard';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0a1926] lg:flex">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {mobileOpen && (
        <button type="button" aria-label="Cerrar menú" className="app-overlay fixed inset-0 z-40 lg:hidden" onClick={closeMobileMenu} />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#0a1926] shadow-xl transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-end border-b border-white/10 px-3 py-3">
          <button type="button" onClick={closeMobileMenu} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent user={user} onLogout={handleLogout} onNavigate={closeMobileMenu} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{currentPage}</p>
            <p className="truncate text-xs text-slate-500">{BRAND_NAME}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
