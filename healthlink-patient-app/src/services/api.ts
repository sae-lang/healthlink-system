const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface SessionUser {
  id: string;
  name: string;
  phone: string;
  role: 'PATIENT';
}

interface SessionState {
  token: string;
  user: SessionUser;
}

export const getPatientSession = (): SessionState | null => {
  const token = localStorage.getItem('healthlink_patient_token');
  const user = localStorage.getItem('healthlink_patient_user');

  if (!token || !user) {
    return null;
  }

  return {
    token,
    user: JSON.parse(user),
  };
};

export const setPatientSession = (token: string, user: SessionUser) => {
  localStorage.setItem('healthlink_patient_token', token);
  localStorage.setItem('healthlink_patient_user', JSON.stringify(user));
};

export const clearPatientSession = () => {
  localStorage.removeItem('healthlink_patient_token');
  localStorage.removeItem('healthlink_patient_user');
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getPatientSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(payload.message || 'Request failed');
  }

  return response.json();
}
