import { TokenPayload } from "@/lib/auth";
import { Role } from "../../generated/prisma/enums";
import { NextRequest } from "next/server";

export async function getUser(req: NextRequest): Promise<TokenPayload | null> {
  const id = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") as Role | null;

  if (!id || !role) return null;

  return {
    userId: id,
    role,
  };
}

export async function requireAuth(req: NextRequest): Promise<TokenPayload> {
  const user = await getUser(req);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireRoles(
  req: NextRequest,
  roles: Role[],
): Promise<TokenPayload> {
  const user = await requireAuth(req);

  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
