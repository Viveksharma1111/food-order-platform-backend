import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().min(1).max(72).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes.",
  ),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
