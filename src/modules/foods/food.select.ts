import type { Prisma } from "@prisma/client";

export const staffFoodSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  available: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FoodSelect;

export const customerFoodSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
} satisfies Prisma.FoodSelect;

export type StaffFoodRow = Prisma.FoodGetPayload<{ select: typeof staffFoodSelect }>;
export type CustomerFoodRow = Prisma.FoodGetPayload<{ select: typeof customerFoodSelect }>;

export function toStaffFood(food: StaffFoodRow) {
  return {
    id: food.id,
    name: food.name,
    description: food.description,
    category: food.category,
    price: food.price.toFixed(2),
    availability: food.available,
    archived: food.archived,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
}

export function toCustomerFood(food: CustomerFoodRow) {
  return {
    id: food.id,
    name: food.name,
    description: food.description,
    category: food.category,
    price: food.price.toFixed(2),
  };
}
