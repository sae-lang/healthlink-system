export interface User {
  id: string;
  email: string;
  name: string;
  role: 'practitioner' | 'admin';
}

export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'self-care';

export interface PatientReport {
  id: string;
  userId: string;
  symptoms: string[];
  recommendation: string;
  triageLevel: TriageLevel;
  timestamp: string;
  reviewed?: boolean;
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
