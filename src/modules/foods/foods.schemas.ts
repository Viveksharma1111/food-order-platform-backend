import { z } from "zod";

function normalizeMoney(value: string | number): string {
  const source = typeof value === "number" ? value.toString() : value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(source)) return source;

  const [whole = "0", fraction] = source.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  return fraction === undefined ? normalizedWhole : `${normalizedWhole}.${fraction}`;
}

export const priceSchema = z.union([z.string(), z.number().finite()])
  .transform(normalizeMoney)
  .refine((value) => /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value), {
    message: "Price must be a decimal amount with at most two fractional digits and fit DECIMAL(10,2).",
  })
  .refine((value) => /[1-9]/.test(value), { message: "Price must be greater than zero." });

const nameSchema = z.string().trim().min(1).max(160);
const descriptionSchema = z.string().trim().min(1).max(10_000);
const categorySchema = z.string().trim().min(1).max(80);

export const createFoodSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  category: categorySchema,
  price: priceSchema,
  availability: z.boolean(),
}).strict();

export const updateFoodSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  category: categorySchema.optional(),
  price: priceSchema.optional(),
  availability: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one supported food field is required.");

export const availabilitySchema = z.object({ availability: z.boolean() }).strict();

export const foodIdParamsSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export const emptyBodySchema = z.object({}).strict();

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
