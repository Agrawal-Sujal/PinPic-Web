import axios from 'axios';
import { clearLocalDatabase } from '../db/appDatabase';

// Create base axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pinpic_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = window.location.pathname.startsWith('/login') ||
                          window.location.pathname.startsWith('/signup') ||
                          window.location.pathname.startsWith('/onboarding');
      if (!isAuthRoute) {
        try {
          await clearLocalDatabase();
        } catch (_) {}

        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (_) {}

        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

