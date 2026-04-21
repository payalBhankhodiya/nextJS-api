import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicRoutes = ["/api/auth/login", "/api/auth/register"];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("MIDDLEWARE_ERROR:", error);

    return NextResponse.redirect(new URL("/login", req.url));
  }
}
