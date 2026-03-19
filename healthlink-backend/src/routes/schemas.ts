import { z } from "zod";

const triageEnum = z.enum(["self-care", "routine", "urgent", "emergency"]);

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(3),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  phone: z.string().min(3),
  password: z.string().min(8),
  role: z.enum(["PATIENT", "DOCTOR"]).optional(),
});

export const analyzeSymptomsSchema = z.object({
  symptoms: z.array(z.string().min(1)).min(1),
  customNotes: z.string().optional(),
  language: z.string().optional(),
});

export const reviewCaseSchema = z.object({
  caseId: z.string().uuid(),
  recommendation: z.string().min(5),
  recommendAppointment: z.boolean().default(false),
});

export const appointmentSchema = z.object({
  caseId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  date: z.string().datetime(),
});

export const ruleCreateSchema = z.object({
  condition: z.string().min(2),
  symptoms: z.array(z.string().min(1)).min(1),
  recommendation: z.string().min(5),
  triageLevel: triageEnum,
  isActive: z.boolean().default(true),
});

export const ruleUpdateSchema = ruleCreateSchema.partial();
