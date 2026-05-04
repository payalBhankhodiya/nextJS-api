import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.uuid({ message: "Invalid product ID" }),

  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .int({ message: "Quantity must be an integer" })
    .min(1, { message: "Quantity must be at least 1" }),
});




export const updateToCartSchema = z.object({
  productId: z.uuid({ message: "Invalid product ID" }),

  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .int({ message: "Quantity must be an integer" })
    .refine((val) => val !== 0, {
      message: "Quantity cannot be zero",
    }),
});