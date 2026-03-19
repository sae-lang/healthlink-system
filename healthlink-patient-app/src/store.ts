import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  userId: string;
  phoneNumber: string;
  token: string;
}

interface SymptomReport {
  id: string;
  userId: string;
  symptoms: string[];
  recommendation: string;
  triageLevel: 'emergency' | 'urgent' | 'routine' | 'self-care';
  timestamp: string;
  synced: boolean;
}

interface AppState {
  user: User | null;
  language: 'en' | 'sw';
  reports: SymptomReport[];
  setUser: (user: User | null) => void;
  setLanguage: (lang: 'en' | 'sw') => void;
  addReport: (report: SymptomReport) => void;
  updateReportSyncStatus: (id: string, synced: boolean) => void;
  clearData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      language: 'en',
      reports: [],
      setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language }),
      addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })),
      updateReportSyncStatus: (id, synced) =>
        set((state) => ({
          reports: state.reports.map((r) => (r.id === id ? { ...r, synced } : r)),
        })),
      clearData: () => set({ user: null, reports: [] }),
    }),
    {
      name: 'healthlink-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
