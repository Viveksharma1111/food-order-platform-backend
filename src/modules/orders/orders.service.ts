import { randomBytes } from "node:crypto";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error-handler.js";
import { isAllowedOrderTransition } from "./order-status.js";
import {
  customerOrderSelect,
  staffOrderSelect,
  toCustomerOrder,
  toStaffOrder,
} from "./order.select.js";
import type { CreateOrderInput, OrderListQuery } from "./orders.schemas.js";

const ORDER_TOTAL_MAX = new Prisma.Decimal("9999999999.99");
const notFound = () => new ApiError(404, "ORDER_NOT_FOUND", "The requested order was not found.");

function createReference(): string {
  return `ORD-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class OrdersService {
  async createForCustomer(customerId: string, input: CreateOrderInput) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const requestedIds = input.items.map(({ foodId }) => foodId);
          const foods = await transaction.food.findMany({
            where: { id: { in: requestedIds } },
            select: { id: true, name: true, price: true, available: true, archived: true },
          });
          const foodsById = new Map(foods.map((food) => [food.id, food]));
          const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];
          let total = new Prisma.Decimal(0);

          for (const requestedItem of input.items) {
            const food = foodsById.get(requestedItem.foodId);
            if (!food) {
              throw new ApiError(404, "FOOD_NOT_FOUND", "One or more requested foods were not found.");
            }
            if (food.archived) {
              throw new ApiError(409, "FOOD_ARCHIVED", "Archived foods cannot be ordered.");
            }
            if (!food.available) {
              throw new ApiError(409, "FOOD_UNAVAILABLE", "Unavailable foods cannot be ordered.");
            }

            const quantity = new Prisma.Decimal(requestedItem.quantity);
            const lineTotal = food.price.mul(quantity);
            total = total.plus(lineTotal);
            if (lineTotal.greaterThan(ORDER_TOTAL_MAX) || total.greaterThan(ORDER_TOTAL_MAX)) {
              throw new ApiError(400, "ORDER_TOTAL_TOO_LARGE", "The requested order total exceeds the supported monetary range.");
            }

            orderItems.push({
              food: { connect: { id: food.id } },
              foodNameSnapshot: food.name,
              unitPriceSnapshot: food.price,
              quantity: requestedItem.quantity,
              lineTotal,
            });
          }

          const created = await transaction.order.create({
            data: {
              reference: createReference(),
              customer: { connect: { id: customerId } },
              status: OrderStatus.PLACED,
              notes: input.notes ?? null,
              total,
              items: { create: orderItems },
            },
            select: customerOrderSelect,
          });
          return toCustomerOrder(created);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        if (attempt === 2) {
          throw new ApiError(409, "ORDER_REFERENCE_CONFLICT", "A unique order reference could not be generated. Please retry.");
        }
      }
    }

    throw new ApiError(409, "ORDER_REFERENCE_CONFLICT", "A unique order reference could not be generated. Please retry.");
  }

  async listForCustomer(customerId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: customerOrderSelect,
    });
    return orders.map(toCustomerOrder);
  }

  async getForCustomer(customerId: string, id: string) {
    const order = await prisma.order.findFirst({ where: { id, customerId }, select: customerOrderSelect });
    if (!order) throw notFound();
    return toCustomerOrder(order);
  }

  async listForStaff(query: OrderListQuery) {
    const orders = await prisma.order.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: staffOrderSelect,
    });
    return orders.map(toStaffOrder);
  }

  async getForStaff(id: string) {
    const order = await prisma.order.findUnique({ where: { id }, select: staffOrderSelect });
    if (!order) throw notFound();
    return toStaffOrder(order);
  }

  async updateNotes(id: string, notes: string | null) {
    const current = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw notFound();
    const updated = await prisma.order.update({ where: { id }, data: { notes }, select: staffOrderSelect });
    return toStaffOrder(updated);
  }

  async updateStatus(id: string, requestedStatus: OrderStatus) {
    const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw notFound();
    if (!isAllowedOrderTransition(current.status, requestedStatus)) {
      throw new ApiError(409, "INVALID_ORDER_TRANSITION", `Order cannot transition from ${current.status} to ${requestedStatus}.`);
    }

    const updatedCount = await prisma.order.updateMany({
      where: { id, status: current.status },
      data: { status: requestedStatus },
    });
    if (updatedCount.count === 0) {
      throw new ApiError(409, "INVALID_ORDER_TRANSITION", "The order status changed before this update could be applied.");
    }
    return this.getForStaff(id);
  }
}
