import type { Role } from "../constants/enums.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      phone: string;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
