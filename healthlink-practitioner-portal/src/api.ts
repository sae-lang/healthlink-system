import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthlink_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('healthlink_token');
      localStorage.removeItem('healthlink_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
