import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { CASE_STATUS, RECOMMENDATION_SOURCE, ROLES, TRIAGE_LEVELS } from "../constants/enums.js";
import { db } from "./connection.js";

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symptoms_json TEXT NOT NULL,
  triage_level TEXT NOT NULL CHECK (triage_level IN ('self-care', 'routine', 'urgent', 'emergency')),
  ai_result TEXT,
  status TEXT NOT NULL,
  doctor_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('SYSTEM', 'AI', 'DOCTOR')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS diagnostic_rules (
  id TEXT PRIMARY KEY,
  condition_name TEXT NOT NULL,
  symptoms_json TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  triage_level TEXT NOT NULL CHECK (triage_level IN ('self-care', 'routine', 'urgent', 'emergency')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const seedRules = [
  {
    conditionName: "Severe Respiratory Distress",
    symptoms: ["shortness of breath", "chest pain", "bluish lips"],
    recommendation: "Seek emergency medical care immediately.",
    triageLevel: TRIAGE_LEVELS.EMERGENCY,
  },
  {
    conditionName: "Possible Pneumonia",
    symptoms: ["fever", "cough", "fatigue"],
    recommendation: "Visit a clinic promptly for assessment and hydration guidance.",
    triageLevel: TRIAGE_LEVELS.URGENT,
  },
  {
    conditionName: "Common Cold",
    symptoms: ["runny nose", "sneezing", "mild cough"],
    recommendation: "Rest, hydrate, and use supportive home care.",
    triageLevel: TRIAGE_LEVELS.SELF_CARE,
  },
  {
    conditionName: "Migraine Pattern",
    symptoms: ["headache", "nausea", "blurred vision"],
    recommendation: "Arrange a routine review and monitor worsening symptoms.",
    triageLevel: TRIAGE_LEVELS.ROUTINE,
  },
];

export const runMigrations = () => {
  db.exec(schema);

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, phone, role, password_hash, created_at)
      VALUES (@id, @name, @phone, @role, @passwordHash, @createdAt)
    `);
    const passwordHash = bcrypt.hashSync("Password123!", 10);
    const createdAt = new Date().toISOString();

    insertUser.run({
      id: randomUUID(),
      name: "Dr. Sarah Smith",
      phone: "doctor@healthlink.org",
      role: ROLES.DOCTOR,
      passwordHash,
      createdAt,
    });

    insertUser.run({
      id: randomUUID(),
      name: "John Patient",
      phone: "patient@healthlink.org",
      role: ROLES.PATIENT,
      passwordHash,
      createdAt,
    });
  }

  const ruleCount = db.prepare("SELECT COUNT(*) as count FROM diagnostic_rules").get() as { count: number };
  if (ruleCount.count === 0) {
    const insertRule = db.prepare(`
      INSERT INTO diagnostic_rules (
        id, condition_name, symptoms_json, recommendation, triage_level, is_active, created_at, updated_at
      ) VALUES (
        @id, @conditionName, @symptomsJson, @recommendation, @triageLevel, @isActive, @createdAt, @updatedAt
      )
    `);

    for (const rule of seedRules) {
      const now = new Date().toISOString();
      insertRule.run({
        id: randomUUID(),
        conditionName: rule.conditionName,
        symptomsJson: JSON.stringify(rule.symptoms),
        recommendation: rule.recommendation,
        triageLevel: rule.triageLevel,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const caseCount = db.prepare("SELECT COUNT(*) as count FROM cases").get() as { count: number };
  if (caseCount.count === 0) {
    const patient = db.prepare("SELECT id FROM users WHERE role = ? LIMIT 1").get(ROLES.PATIENT) as { id: string };
    const doctor = db.prepare("SELECT id FROM users WHERE role = ? LIMIT 1").get(ROLES.DOCTOR) as { id: string };
    const caseId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO cases (id, user_id, symptoms_json, triage_level, ai_result, status, doctor_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caseId,
      patient.id,
      JSON.stringify(["fever", "cough", "fatigue"]),
      TRIAGE_LEVELS.URGENT,
      JSON.stringify({
        condition: "Possible Pneumonia",
        recommendation: "Visit a clinic promptly for examination.",
        triageLevel: TRIAGE_LEVELS.URGENT,
      }),
      CASE_STATUS.PENDING_REVIEW,
      doctor.id,
      now,
      now,
    );

    db.prepare(`
      INSERT INTO recommendations (id, case_id, source, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      caseId,
      RECOMMENDATION_SOURCE.SYSTEM,
      "Visit a clinic promptly for examination.",
      now,
    );
  }
};
