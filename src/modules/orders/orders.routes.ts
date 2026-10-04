import { Router } from "express";
import { authenticate } from "../../middleware/authentication.js";
import { requireRole } from "../../middleware/authorization.js";
import {
  createCustomerOrder,
  getCustomerOrder,
  getStaffOrder,
  listCustomerOrders,
  listStaffOrders,
  updateStaffOrderNotes,
  updateStaffOrderStatus,
} from "./orders.controller.js";

export const customerOrdersRouter = Router();
customerOrdersRouter.use(authenticate, requireRole("CUSTOMER"));
customerOrdersRouter.post("/", createCustomerOrder);
customerOrdersRouter.get("/", listCustomerOrders);
customerOrdersRouter.get("/:id", getCustomerOrder);

export const staffOrdersRouter = Router();
staffOrdersRouter.use(authenticate, requireRole("ADMIN", "OPERATOR"));
staffOrdersRouter.get("/", listStaffOrders);
staffOrdersRouter.get("/:id", getStaffOrder);
staffOrdersRouter.patch("/:id/notes", updateStaffOrderNotes);
staffOrdersRouter.patch("/:id/status", updateStaffOrderStatus);
