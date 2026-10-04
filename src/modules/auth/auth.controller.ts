import type { RequestHandler } from "express";
import { loginSchema } from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const data = await authService.login(input);
  response.status(200).json({ success: true, data });
};

export const currentIdentity: RequestHandler = (request, response) => {
  response.status(200).json({ success: true, data: request.authenticatedUser });
};
