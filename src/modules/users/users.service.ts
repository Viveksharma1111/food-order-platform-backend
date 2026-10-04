import bcrypt from "bcrypt";
import { Prisma, UserRole } from "@prisma/client";
import { ApiError } from "../../middleware/error-handler.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthenticatedUser } from "../../types/authenticated-user.js";
import { safeUserSelect } from "./user.select.js";
import type { CreateUserInput, UpdateUserInput } from "./users.schemas.js";

export class UsersService {
  async listStaff() {
    return prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.OPERATOR] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: safeUserSelect,
    });
  }

  async getStaffById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: { in: [UserRole.ADMIN, UserRole.OPERATOR] } },
      select: safeUserSelect,
    });
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "The requested staff user was not found.");
    }
    return user;
  }

  async createStaff(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        active: input.active,
      },
      select: safeUserSelect,
    });
  }

  async updateStaff(id: string, actor: AuthenticatedUser, input: UpdateUserInput) {
    return prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findFirst({
        where: { id, role: { in: [UserRole.ADMIN, UserRole.OPERATOR] } },
        select: { id: true, role: true, active: true },
      });

      if (!target) {
        throw new ApiError(404, "USER_NOT_FOUND", "The requested staff user was not found.");
      }

      const removesAdminAccess = (input.role !== undefined && input.role !== UserRole.ADMIN)
        || input.active === false;

      if (actor.id === target.id && removesAdminAccess) {
        throw new ApiError(400, "SELF_LOCKOUT_PREVENTED", "You cannot demote or deactivate your own administrator account.");
      }

      if (target.role === UserRole.ADMIN && target.active && removesAdminAccess) {
        const activeAdminCount = await transaction.user.count({
          where: { role: UserRole.ADMIN, active: true },
        });
        if (activeAdminCount <= 1) {
          throw new ApiError(409, "LAST_ADMIN_REQUIRED", "At least one active administrator must remain.");
        }
      }

      const data: Prisma.UserUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.role !== undefined) data.role = input.role;
      if (input.active !== undefined) data.active = input.active;

      return transaction.user.update({
        where: { id: target.id },
        data,
        select: safeUserSelect,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
