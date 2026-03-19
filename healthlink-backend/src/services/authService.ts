import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ROLES } from "../constants/enums.js";
import { UserRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";

const userRepository = new UserRepository();

const signToken = (user: { id: string; name: string; phone: string; role: string }) =>
  jwt.sign(
    {
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

export class AuthService {
  register(input: { name: string; phone: string; password: string }) {
    const existing = userRepository.findByPhone(input.phone);
    if (existing) {
      throw new ApiError(409, "A user with this phone/email already exists");
    }

    const user = userRepository.create({
      name: input.name,
      phone: input.phone,
      role: ROLES.PATIENT,
      passwordHash: bcrypt.hashSync(input.password, 10),
    });

    return {
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  login(input: { phone: string; password: string; role?: string }) {
    const user = userRepository.findByPhone(input.phone);
    if (!user || !bcrypt.compareSync(input.password, user.password_hash)) {
      throw new ApiError(401, "Invalid credentials");
    }

    if (input.role && input.role !== user.role) {
      throw new ApiError(403, "User role does not match this application");
    }

    return {
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
