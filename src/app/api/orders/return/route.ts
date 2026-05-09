import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/require-role";

export async function PATCH(
  req: NextRequest,
  
) {
  try {
    const currentUser = await requireRoles(req, ["USER"]);

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID is required" },
        { status: 400 },
      );
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // ownership check
    if (order.userId !== currentUser.userId) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // only delivered orders can be returned
    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { message: "Only delivered orders can be returned" },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "RETURN_REQUESTED",
      },
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error returning order" },
      { status: 500 }
    );
  }
}