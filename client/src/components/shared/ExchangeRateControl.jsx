import { useEffect, useState } from 'react';

import { useExchangeRate } from '../../context/ExchangeRateContext.jsx';

/**
 * Control reutilizable para editar el tipo de cambio USD → BOB.
 * @param {'sidebar' | 'light'} [variant]
 */
export default function ExchangeRateControl({ variant = 'sidebar' }) {
  const { tipoCambioBob, updateRate, loading } = useExchangeRate();
  const [value, setValue] = useState('6.96');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setValue(String(tipoCambioBob));
  }, [tipoCambioBob, loading]);

  const handleSave = async () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    setSaving(true);
    try {
      await updateRate(next);
    } finally {
      setSaving(false);
    }
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div className={isSidebar ? 'border-t border-white/10 px-4 py-4' : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'}>
      <label
        htmlFor={`tipo-cambio-${variant}`}
        className={
          isSidebar
            ? 'mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400'
            : 'mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500'
        }
      >
        Tipo de cambio (USD → BOB)
      </label>
      <div className="flex gap-2">
        <input
          id={`tipo-cambio-${variant}`}
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={
            isSidebar
              ? 'min-h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-emerald-500'
              : 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'
          }
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? '...' : 'OK'}
        </button>
      </div>
    </div>
  );
}
