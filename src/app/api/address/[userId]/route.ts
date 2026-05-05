import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";

// Get by userId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const currentUser = await requireRoles(req, ["ADMIN", "USER"]);

    const { userId } = await params;

    if (currentUser.role !== "ADMIN" && currentUser.userId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const userAddress = await prisma.address.findMany({
      where: { userId: userId },
    });

    if (!userAddress) {
      return NextResponse.json(
        { message: "User's address not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(userAddress);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error fetching address" },
      { status: 500 },
    );
  }
}
