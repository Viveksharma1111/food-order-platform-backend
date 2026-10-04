import type { RequestHandler } from "express";
import {
  availabilitySchema,
  createFoodSchema,
  emptyBodySchema,
  foodIdParamsSchema,
  updateFoodSchema,
} from "./foods.schemas.js";
import { FoodsService } from "./foods.service.js";

const foodsService = new FoodsService();

export const listFoods: RequestHandler = async (_request, response) => {
  const data = await foodsService.listStaff();
  response.status(200).json({ success: true, data });
};

export const listAvailableFoods: RequestHandler = async (_request, response) => {
  const data = await foodsService.listAvailableForCustomers();
  response.status(200).json({ success: true, data });
};

export const createFood: RequestHandler = async (request, response) => {
  const input = createFoodSchema.parse(request.body);
  const data = await foodsService.create(input);
  response.status(201).json({ success: true, data });
};

export const getFood: RequestHandler = async (request, response) => {
  const { id } = foodIdParamsSchema.parse(request.params);
  const data = await foodsService.getStaffById(id);
  response.status(200).json({ success: true, data });
};

export const updateFood: RequestHandler = async (request, response) => {
  const { id } = foodIdParamsSchema.parse(request.params);
  const input = updateFoodSchema.parse(request.body);
  const data = await foodsService.update(id, input);
  response.status(200).json({ success: true, data });
};

export const updateFoodAvailability: RequestHandler = async (request, response) => {
  const { id } = foodIdParamsSchema.parse(request.params);
  const { availability } = availabilitySchema.parse(request.body);
  const data = await foodsService.setAvailability(id, availability);
  response.status(200).json({ success: true, data });
};

export const archiveFood: RequestHandler = async (request, response) => {
  const { id } = foodIdParamsSchema.parse(request.params);
  emptyBodySchema.parse(request.body ?? {});
  const data = await foodsService.archive(id);
  response.status(200).json({ success: true, data });
};
