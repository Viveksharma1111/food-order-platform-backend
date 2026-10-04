import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { ApiError, errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { foodsRouter } from "./modules/foods/foods.routes.js";
import { customerOrdersRouter, staffOrdersRouter } from "./modules/orders/orders.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "100kb" }));

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/foods", foodsRouter);
app.use("/api/v1/customer/orders", customerOrdersRouter);
app.use("/api/v1/orders", staffOrdersRouter);
app.use((_request, _response, next) => {
  next(new ApiError(404, "NOT_FOUND", "The requested resource was not found."));
});
app.use(errorHandler);
