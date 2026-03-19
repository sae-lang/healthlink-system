import { randomUUID } from "node:crypto";
import type { TriageLevel } from "../constants/enums.js";
import { db } from "../database/connection.js";

export interface RuleRecord {
  id: string;
  condition_name: string;
  symptoms_json: string;
  recommendation: string;
  triage_level: TriageLevel;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class RuleRepository {
  list(includeInactive = true) {
    const sql = includeInactive
      ? "SELECT * FROM diagnostic_rules ORDER BY updated_at DESC"
      : "SELECT * FROM diagnostic_rules WHERE is_active = 1 ORDER BY updated_at DESC";
    return db.prepare(sql).all() as RuleRecord[];
  }

  findById(id: string) {
    return db.prepare("SELECT * FROM diagnostic_rules WHERE id = ?").get(id) as RuleRecord | undefined;
  }

  create(input: {
    conditionName: string;
    symptoms: string[];
    recommendation: string;
    triageLevel: TriageLevel;
    isActive: boolean;
  }) {
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      condition_name: input.conditionName,
      symptoms_json: JSON.stringify(input.symptoms),
      recommendation: input.recommendation,
      triage_level: input.triageLevel,
      is_active: input.isActive ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO diagnostic_rules (
        id, condition_name, symptoms_json, recommendation, triage_level, is_active, created_at, updated_at
      ) VALUES (
        @id, @condition_name, @symptoms_json, @recommendation, @triage_level, @is_active, @created_at, @updated_at
      )
    `).run(record);

    return this.findById(record.id)!;
  }

  update(
    id: string,
    updates: Partial<{
      conditionName: string;
      symptoms: string[];
      recommendation: string;
      triageLevel: TriageLevel;
      isActive: boolean;
    }>,
  ) {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const next = {
      id,
      condition_name: updates.conditionName ?? existing.condition_name,
      symptoms_json: JSON.stringify(updates.symptoms ?? (JSON.parse(existing.symptoms_json) as string[])),
      recommendation: updates.recommendation ?? existing.recommendation,
      triage_level: updates.triageLevel ?? existing.triage_level,
      is_active: updates.isActive === undefined ? existing.is_active : updates.isActive ? 1 : 0,
      updated_at: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE diagnostic_rules
      SET condition_name = @condition_name,
          symptoms_json = @symptoms_json,
          recommendation = @recommendation,
          triage_level = @triage_level,
          is_active = @is_active,
          updated_at = @updated_at
      WHERE id = @id
    `).run(next);

    return this.findById(id)!;
  }

  deactivate(id: string) {
    return this.update(id, { isActive: false });
  }
}
