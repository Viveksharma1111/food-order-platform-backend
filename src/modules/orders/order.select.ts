import type { Prisma } from "@prisma/client";
import { safeUserSelect } from "../users/user.select.js";

const orderItemsSelect = {
  id: true,
  foodId: true,
  foodNameSnapshot: true,
  unitPriceSnapshot: true,
  quantity: true,
  lineTotal: true,
} satisfies Prisma.OrderItemSelect;

export const customerOrderSelect = {
  id: true,
  reference: true,
  status: true,
  notes: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  items: { orderBy: [{ id: "asc" }], select: orderItemsSelect },
} satisfies Prisma.OrderSelect;

export const staffOrderSelect = {
  ...customerOrderSelect,
  customer: { select: safeUserSelect },
} satisfies Prisma.OrderSelect;

export type CustomerOrderRow = Prisma.OrderGetPayload<{ select: typeof customerOrderSelect }>;
export type StaffOrderRow = Prisma.OrderGetPayload<{ select: typeof staffOrderSelect }>;

function mapItems(items: CustomerOrderRow["items"]) {
  return items.map((item) => ({
    foodId: item.foodId,
    foodName: item.foodNameSnapshot,
    unitPrice: item.unitPriceSnapshot.toFixed(2),
    quantity: item.quantity,
    lineTotal: item.lineTotal.toFixed(2),
  }));
}

function mapOrderFields(order: CustomerOrderRow) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    notes: order.notes,
    total: order.total.toFixed(2),
    items: mapItems(order.items),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function toCustomerOrder(order: CustomerOrderRow) {
  return mapOrderFields(order);
}

export function toStaffOrder(order: StaffOrderRow) {
  return {
    ...mapOrderFields(order),
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      role: order.customer.role,
      active: order.customer.active,
    },
  };
}
