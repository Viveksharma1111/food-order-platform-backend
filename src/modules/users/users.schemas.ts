import { UserRole } from "@prisma/client";
import { z } from "zod";

const staffRoleSchema = z.enum([UserRole.ADMIN, UserRole.OPERATOR]);
const emailSchema = z.string().trim().toLowerCase().max(254).email();
const nameSchema = z.string().trim().min(1).max(120);
const passwordSchema = z.string().min(12).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  "Password must not exceed 72 UTF-8 bytes.",
);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: staffRoleSchema,
  active: z.boolean().default(true),
}).strict();

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one supported field is required.");

export const userIdParamsSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
