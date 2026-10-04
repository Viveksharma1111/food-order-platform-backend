import { z } from "zod";

const idSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const orderStatusSchema = z.enum(["PLACED", "PREPARING", "COMPLETED", "CANCELLED"]);

const orderItemSchema = z.object({
  foodId: idSchema,
  quantity: z.number().int().min(1).max(2_147_483_647),
}).strict();

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
  notes: z.string().max(1000).optional(),
}).strict().superRefine((value, context) => {
  const foodIds = value.items.map(({ foodId }) => foodId);
  if (new Set(foodIds).size !== foodIds.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Each food may appear only once in an order." });
  }
});

export const orderIdParamsSchema = z.object({ id: idSchema }).strict();
export const customerOrderListQuerySchema = z.object({}).strict();
export const orderListQuerySchema = z.object({ status: orderStatusSchema.optional() }).strict();
export const updateOrderNotesSchema = z.object({ notes: z.string().max(1000).nullable() })
  .strict()
  .refine((value) => value.notes !== undefined, "Notes are required.");
export const updateOrderStatusSchema = z.object({ status: orderStatusSchema }).strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
