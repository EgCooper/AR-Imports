import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isLoginOrRegister =
      url.includes('/auth/login') || url.includes('/auth/register');
    const isRefreshCall = url.includes('/auth/refresh');

    if (status === 401 && !original._retry && !isLoginOrRegister && !isRefreshCall) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        const isSessionProbe = url.includes('/auth/me');
        if (!isSessionProbe && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
