export const ROLES = {
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
} as const;

export const TRIAGE_LEVELS = {
  SELF_CARE: "self-care",
  ROUTINE: "routine",
  URGENT: "urgent",
  EMERGENCY: "emergency",
} as const;

export const CASE_STATUS = {
  AUTO_RESOLVED: "AUTO_RESOLVED",
  PENDING_REVIEW: "PENDING_REVIEW",
  REVIEWED: "REVIEWED",
  APPOINTMENT_RECOMMENDED: "APPOINTMENT_RECOMMENDED",
  CLOSED: "CLOSED",
} as const;

export const RECOMMENDATION_SOURCE = {
  SYSTEM: "SYSTEM",
  AI: "AI",
  DOCTOR: "DOCTOR",
} as const;

export const APPOINTMENT_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type TriageLevel = (typeof TRIAGE_LEVELS)[keyof typeof TRIAGE_LEVELS];
export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];
export type RecommendationSource = (typeof RECOMMENDATION_SOURCE)[keyof typeof RECOMMENDATION_SOURCE];
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];
