import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/api/auth/register" || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
    return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
  }

    const decoded = verifyToken(token);

     if (!decoded) {
    return NextResponse.json({ message: "INVALID TOKEN" }, { status: 401 });
  }

   if (pathname.startsWith("/api/admin") && decoded.role !== "ADMIN") {
    return NextResponse.json({ message: "FORBIDDEN" }, { status: 403 });
  }
    const headers = new Headers(req.headers);
    headers.set("x-user-id", decoded.userId);
    headers.set("x-user-role", decoded.role);

    return NextResponse.next({
      request: { headers },
    });
  } catch (error) {
    console.error("PROXY_ERROR:", error);

    return NextResponse.redirect(new URL("/login", req.url));
  }
}





