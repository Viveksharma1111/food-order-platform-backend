import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApiError } from "../../middleware/error-handler.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { safeUserSelect } from "../users/user.select.js";
import type { LoginInput } from "./auth.schemas.js";

const invalidCredentials = () => new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
const unknownAccountPasswordHash = "$2b$12$uS2BW7.yzPymwMeUVQPQQeEUX8mTufZcEi2gFMd./fhAnSMPqCl3O";

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { ...safeUserSelect, passwordHash: true },
    });

    if (!user) {
      await bcrypt.compare(input.password, unknownAccountPasswordHash);
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches || !user.active) {
      throw invalidCredentials();
    }

    const token = jwt.sign({}, env.JWT_SECRET, {
      algorithm: "HS256",
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return { token, tokenType: "Bearer" as const, expiresIn: env.JWT_EXPIRES_IN, user: safeUser };
  }
}
