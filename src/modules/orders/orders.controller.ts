import type { RequestHandler } from "express";
import { ApiError } from "../../middleware/error-handler.js";
import {
  createOrderSchema,
  customerOrderListQuerySchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  updateOrderNotesSchema,
  updateOrderStatusSchema,
} from "./orders.schemas.js";
import { OrdersService } from "./orders.service.js";

const ordersService = new OrdersService();

function authenticatedUserId(request: Parameters<RequestHandler>[0]): string {
  const userId = request.authenticatedUser?.id;
  if (!userId) throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required.");
  return userId;
}

export const createCustomerOrder: RequestHandler = async (request, response) => {
  const input = createOrderSchema.parse(request.body);
  const data = await ordersService.createForCustomer(authenticatedUserId(request), input);
  response.status(201).json({ success: true, data });
};

export const listCustomerOrders: RequestHandler = async (request, response) => {
  customerOrderListQuerySchema.parse(request.query);
  const data = await ordersService.listForCustomer(authenticatedUserId(request));
  response.status(200).json({ success: true, data });
};

export const getCustomerOrder: RequestHandler = async (request, response) => {
  const { id } = orderIdParamsSchema.parse(request.params);
  const data = await ordersService.getForCustomer(authenticatedUserId(request), id);
  response.status(200).json({ success: true, data });
};

export const listStaffOrders: RequestHandler = async (request, response) => {
  const query = orderListQuerySchema.parse(request.query);
  const data = await ordersService.listForStaff(query);
  response.status(200).json({ success: true, data });
};

export const getStaffOrder: RequestHandler = async (request, response) => {
  const { id } = orderIdParamsSchema.parse(request.params);
  const data = await ordersService.getForStaff(id);
  response.status(200).json({ success: true, data });
};

export const updateStaffOrderNotes: RequestHandler = async (request, response) => {
  const { id } = orderIdParamsSchema.parse(request.params);
  const { notes } = updateOrderNotesSchema.parse(request.body);
  const data = await ordersService.updateNotes(id, notes);
  response.status(200).json({ success: true, data });
};

export const updateStaffOrderStatus: RequestHandler = async (request, response) => {
  const { id } = orderIdParamsSchema.parse(request.params);
  const { status } = updateOrderStatusSchema.parse(request.body);
  const data = await ordersService.updateStatus(id, status);
  response.status(200).json({ success: true, data });
};
