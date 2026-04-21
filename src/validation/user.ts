import { z } from "zod";
import { Role } from "../../generated/prisma/enums";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 chars"),
  role: z.enum(Role),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
