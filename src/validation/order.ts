import { z } from "zod";
import { OrderStatus } from "../../generated/prisma/enums";

export const createOrderSchema = z.object({
  userId: z.uuid(),
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const updateOrderSchema = z.object({
  status: z.enum(OrderStatus),
});
