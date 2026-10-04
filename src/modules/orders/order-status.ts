import { OrderStatus } from "@prisma/client";

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function isAllowedOrderTransition(current: OrderStatus, requested: OrderStatus): boolean {
  return allowedTransitions[current].includes(requested);
}
