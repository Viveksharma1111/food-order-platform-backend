import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "./error-handler.js";
import { safeUserSelect } from "../modules/users/user.select.js";

const authenticationError = () => new ApiError(401, "UNAUTHENTICATED", "Authentication is required.");

export const authenticate: RequestHandler = async (request, _response, next) => {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match?.[1]) {
    next(authenticationError());
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: ["HS256"] });
    if (
      typeof payload === "string"
      || typeof payload.sub !== "string"
      || payload.sub.length === 0
      || typeof payload.exp !== "number"
    ) {
      next(authenticationError());
      return;
    }
    userId = payload.sub;
  } catch {
    next(authenticationError());
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });

  if (!user?.active) {
    next(authenticationError());
    return;
  }

  request.authenticatedUser = user;
  next();
};
