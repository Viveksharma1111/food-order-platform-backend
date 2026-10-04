import { Router } from "express";
import { authenticate } from "../../middleware/authentication.js";
import { requireRole } from "../../middleware/authorization.js";
import { createUser, getUser, listUsers, updateUser } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole("ADMIN"));
usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.get("/:id", getUser);
usersRouter.patch("/:id", updateUser);
