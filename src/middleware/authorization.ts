import { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";
import { ApiError } from "./error-handler.js";

type RoleName = `${UserRole}`;

export const requireRole = (...roles: RoleName[]): RequestHandler => (request, _response, next) => {
  const user = request.authenticatedUser;
  if (!user) {
    next(new ApiError(401, "UNAUTHENTICATED", "Authentication is required."));
    return;
  }

  if (!roles.includes(`${user.role}` as RoleName)) {
    next(new ApiError(403, "FORBIDDEN", "You do not have permission to access this resource."));
    return;
  }

  next();
};
