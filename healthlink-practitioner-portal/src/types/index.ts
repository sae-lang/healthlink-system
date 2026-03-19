export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'DOCTOR';
}

export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'self-care';

export interface PatientReport {
  id: string;
  userId: string;
  patientName?: string;
  symptoms: string[];
  recommendation?: string;
  triageLevel: TriageLevel;
  status: string;
  createdAt: string;
  reviewed?: boolean;
  recommendations?: {
    id: string;
    source: string;
    content: string;
    createdAt: string;
  }[];
  aiResult?: {
    condition?: string;
    recommendation?: string;
  } | null;
}

export interface DiagnosticRule {
  id: string;
  condition: string;
  symptoms: string[];
  recommendation: string;
  triageLevel: TriageLevel;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
