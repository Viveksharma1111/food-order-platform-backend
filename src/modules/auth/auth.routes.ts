import { Router } from "express";
import { authenticate } from "../../middleware/authentication.js";
import { currentIdentity, login } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, currentIdentity);
