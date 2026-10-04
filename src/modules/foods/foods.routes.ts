import { Router } from "express";
import { authenticate } from "../../middleware/authentication.js";
import { requireRole } from "../../middleware/authorization.js";
import {
  archiveFood,
  createFood,
  getFood,
  listAvailableFoods,
  listFoods,
  updateFood,
  updateFoodAvailability,
} from "./foods.controller.js";

export const foodsRouter = Router();

foodsRouter.get("/available", authenticate, requireRole("CUSTOMER"), listAvailableFoods);

foodsRouter.use(authenticate, requireRole("ADMIN", "OPERATOR"));
foodsRouter.get("/", listFoods);
foodsRouter.post("/", createFood);
foodsRouter.get("/:id", getFood);
foodsRouter.patch("/:id/availability", updateFoodAvailability);
foodsRouter.patch("/:id/archive", archiveFood);
foodsRouter.patch("/:id", updateFood);
foodsRouter.delete("/:id", archiveFood);
