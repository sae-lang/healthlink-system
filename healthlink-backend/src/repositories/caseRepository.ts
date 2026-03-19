import { randomUUID } from "node:crypto";
import type { CaseStatus, TriageLevel } from "../constants/enums.js";
import { db } from "../database/connection.js";

export interface CaseRecord {
  id: string;
  user_id: string;
  symptoms_json: string;
  triage_level: TriageLevel;
  ai_result: string | null;
  status: CaseStatus;
  doctor_id: string | null;
  created_at: string;
  updated_at: string;
}

export class CaseRepository {
  create(input: {
    userId: string;
    symptoms: string[];
    triageLevel: TriageLevel;
    aiResult: Record<string, unknown> | null;
    status: CaseStatus;
    doctorId?: string | null;
  }) {
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      user_id: input.userId,
      symptoms_json: JSON.stringify(input.symptoms),
      triage_level: input.triageLevel,
      ai_result: input.aiResult ? JSON.stringify(input.aiResult) : null,
      status: input.status,
      doctor_id: input.doctorId ?? null,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO cases (id, user_id, symptoms_json, triage_level, ai_result, status, doctor_id, created_at, updated_at)
      VALUES (@id, @user_id, @symptoms_json, @triage_level, @ai_result, @status, @doctor_id, @created_at, @updated_at)
    `).run(record);

    return this.findById(record.id)!;
  }

  findById(id: string) {
    return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as CaseRecord | undefined;
  }

  listByUserId(userId: string) {
    return db.prepare("SELECT * FROM cases WHERE user_id = ? ORDER BY created_at DESC").all(userId) as CaseRecord[];
  }

  listForDoctors() {
    return db
      .prepare("SELECT * FROM cases WHERE status != 'AUTO_RESOLVED' ORDER BY created_at DESC")
      .all() as CaseRecord[];
  }

  updateReview(input: { id: string; doctorId: string; status: CaseStatus }) {
    db.prepare(`
      UPDATE cases
      SET doctor_id = @doctorId,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: input.id,
      doctorId: input.doctorId,
      status: input.status,
      updatedAt: new Date().toISOString(),
    });

    return this.findById(input.id)!;
  }
}
