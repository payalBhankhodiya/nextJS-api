import { z } from "zod";

export const imageSchema = z.object({
  url: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.string(),

  productId: z.uuid().optional(),
});
