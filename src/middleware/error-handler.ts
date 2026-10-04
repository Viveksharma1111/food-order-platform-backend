import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request validation failed." },
    });
    return;
  }

  if (error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed") {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Request body must be valid JSON." },
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the allowed size." },
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "A record with that unique value already exists." },
      });
      return;
    }

    if (error.code === "P2034") {
      response.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "The update conflicted with another change. Retry the request." },
      });
      return;
    }
  }

  console.error("Unexpected request error");
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." },
  });
};
