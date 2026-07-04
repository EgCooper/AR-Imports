import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import api from '../services/api.js';

const ExchangeRateContext = createContext(null);

export function ExchangeRateProvider({ children }) {
  const [tipoCambioBob, setTipoCambioBob] = useState(6.96);
  const [loading, setLoading] = useState(true);

  const loadRate = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        setTipoCambioBob(response.data.data.tipoCambioBob ?? 6.96);
      }
    } catch {
      // mantiene valor por defecto
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRate();
  }, [loadRate]);

  const updateRate = useCallback(async (nextRate) => {
    const response = await api.patch('/settings/exchange-rate', { tipoCambioBob: nextRate });
    if (response.data.success) {
      setTipoCambioBob(response.data.data.tipoCambioBob);
    }
    return response.data;
  }, []);

  const value = useMemo(
    () => ({ tipoCambioBob, loading, updateRate, reloadRate: loadRate }),
    [tipoCambioBob, loading, updateRate, loadRate]
  );

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}

export function useExchangeRate() {
  const context = useContext(ExchangeRateContext);
  if (!context) {
    throw new Error('useExchangeRate debe usarse dentro de ExchangeRateProvider');
  }
  return context;
}
