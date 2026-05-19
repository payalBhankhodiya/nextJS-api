import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be > 0"),
  stock: z.coerce.number().int().nonnegative(),
  sku: z.string().min(3),
  imageIds: z.array(z.uuid()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  imageIds: z.array(z.uuid()).optional(),
  categoryIds: z.array(z.string()).optional(),
});




