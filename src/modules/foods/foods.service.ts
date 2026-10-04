import { Prisma } from "@prisma/client";
import { ApiError } from "../../middleware/error-handler.js";
import { prisma } from "../../lib/prisma.js";
import {
  customerFoodSelect,
  staffFoodSelect,
  toCustomerFood,
  toStaffFood,
} from "./food.select.js";
import type { CreateFoodInput, UpdateFoodInput } from "./foods.schemas.js";

const foodNotFound = () => new ApiError(404, "FOOD_NOT_FOUND", "The requested food was not found.");
const foodAlreadyArchived = () => new ApiError(409, "FOOD_ALREADY_ARCHIVED", "The food has already been archived.");

export class FoodsService {
  async listStaff() {
    const foods = await prisma.food.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: staffFoodSelect,
    });
    return foods.map(toStaffFood);
  }

  async listAvailableForCustomers() {
    const foods = await prisma.food.findMany({
      where: { available: true, archived: false },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: customerFoodSelect,
    });
    return foods.map(toCustomerFood);
  }

  async getStaffById(id: string) {
    const food = await prisma.food.findUnique({ where: { id }, select: staffFoodSelect });
    if (!food) throw foodNotFound();
    return toStaffFood(food);
  }

  async create(input: CreateFoodInput) {
    const food = await prisma.food.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        price: new Prisma.Decimal(input.price),
        available: input.availability,
      },
      select: staffFoodSelect,
    });
    return toStaffFood(food);
  }

  async update(id: string, input: UpdateFoodInput) {
    const current = await prisma.food.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw foodNotFound();

    const data: Prisma.FoodUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
    if (input.availability !== undefined) data.available = input.availability;

    const food = await prisma.food.update({ where: { id }, data, select: staffFoodSelect });
    return toStaffFood(food);
  }

  async setAvailability(id: string, availability: boolean) {
    return this.update(id, { availability });
  }

  async archive(id: string) {
    const result = await prisma.food.updateMany({
      where: { id, archived: false },
      data: { archived: true },
    });

    if (result.count === 0) {
      const existing = await prisma.food.findUnique({ where: { id }, select: { id: true } });
      if (!existing) throw foodNotFound();
      throw foodAlreadyArchived();
    }

    return this.getStaffById(id);
  }
}
