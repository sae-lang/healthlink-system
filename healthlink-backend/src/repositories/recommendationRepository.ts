import { randomUUID } from "node:crypto";
import type { RecommendationSource } from "../constants/enums.js";
import { db } from "../database/connection.js";

export interface RecommendationRecord {
  id: string;
  case_id: string;
  source: RecommendationSource;
  content: string;
  created_at: string;
}

export class RecommendationRepository {
  create(input: { caseId: string; source: RecommendationSource; content: string }) {
    const record = {
      id: randomUUID(),
      case_id: input.caseId,
      source: input.source,
      content: input.content,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO recommendations (id, case_id, source, content, created_at)
      VALUES (@id, @case_id, @source, @content, @created_at)
    `).run(record);

    return record;
  }

  listByCaseId(caseId: string) {
    return db
      .prepare("SELECT * FROM recommendations WHERE case_id = ? ORDER BY created_at ASC")
      .all(caseId) as RecommendationRecord[];
  }
}
