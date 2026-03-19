import { randomUUID } from "node:crypto";
import type { AppointmentStatus } from "../constants/enums.js";
import { db } from "../database/connection.js";

export interface AppointmentRecord {
  id: string;
  case_id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  status: AppointmentStatus;
  created_at: string;
}

export class AppointmentRepository {
  create(input: {
    caseId: string;
    patientId: string;
    doctorId: string;
    date: string;
    status: AppointmentStatus;
  }) {
    const record = {
      id: randomUUID(),
      case_id: input.caseId,
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      date: input.date,
      status: input.status,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO appointments (id, case_id, patient_id, doctor_id, date, status, created_at)
      VALUES (@id, @case_id, @patient_id, @doctor_id, @date, @status, @created_at)
    `).run(record);

    return record;
  }

  listByPatientId(patientId: string) {
    return db.prepare("SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC").all(patientId) as AppointmentRecord[];
  }

  listByDoctorId(doctorId: string) {
    return db.prepare("SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date ASC").all(doctorId) as AppointmentRecord[];
  }
}
