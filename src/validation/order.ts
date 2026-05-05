import { z } from "zod";
import { OrderStatus } from "../../generated/prisma/enums";

export const createOrderSchema = z.object({
  addressId: z.uuid(),

  items: z.array(
    z.object({
      productId: z.uuid(),
      quantity: z.coerce.number().int().positive(),
    })
  ).min(1, "At least one item is required"),
});

export const updateOrderSchema = z.object({
  status: z.enum(OrderStatus),
});
