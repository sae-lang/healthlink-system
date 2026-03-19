import { randomUUID } from "node:crypto";
import type { Role } from "../constants/enums.js";
import { db } from "../database/connection.js";

export interface UserRecord {
  id: string;
  name: string;
  phone: string;
  role: Role;
  password_hash: string;
  created_at: string;
}

export class UserRepository {
  findByPhone(phone: string) {
    return db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as UserRecord | undefined;
  }

  findById(id: string) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRecord | undefined;
  }

  listDoctors() {
    return db.prepare("SELECT * FROM users WHERE role = 'DOCTOR' ORDER BY created_at ASC").all() as UserRecord[];
  }

  create(input: { name: string; phone: string; role: Role; passwordHash: string }) {
    const record = {
      id: randomUUID(),
      name: input.name,
      phone: input.phone,
      role: input.role,
      password_hash: input.passwordHash,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO users (id, name, phone, role, password_hash, created_at)
      VALUES (@id, @name, @phone, @role, @password_hash, @created_at)
    `).run(record);

    return this.findById(record.id)!;
  }
}
