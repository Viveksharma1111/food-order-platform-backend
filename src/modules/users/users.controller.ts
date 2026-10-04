import type { RequestHandler } from "express";
import { createUserSchema, updateUserSchema, userIdParamsSchema } from "./users.schemas.js";
import { UsersService } from "./users.service.js";

const usersService = new UsersService();

export const listUsers: RequestHandler = async (_request, response) => {
  const data = await usersService.listStaff();
  response.status(200).json({ success: true, data });
};

export const createUser: RequestHandler = async (request, response) => {
  const input = createUserSchema.parse(request.body);
  const data = await usersService.createStaff(input);
  response.status(201).json({ success: true, data });
};

export const getUser: RequestHandler = async (request, response) => {
  const { id } = userIdParamsSchema.parse(request.params);
  const data = await usersService.getStaffById(id);
  response.status(200).json({ success: true, data });
};

export const updateUser: RequestHandler = async (request, response) => {
  const { id } = userIdParamsSchema.parse(request.params);
  const input = updateUserSchema.parse(request.body);
  const data = await usersService.updateStaff(id, request.authenticatedUser!, input);
  response.status(200).json({ success: true, data });
};
