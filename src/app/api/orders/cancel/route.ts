import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/require-role";

export async function PATCH(req: NextRequest) {
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
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.userId !== currentUser.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (
      order.status === "SHIPPED" ||
      order.status === "DELIVERED" ||
      order.status === "CANCELLED"
    ) {
      return NextResponse.json(
        { message: "Order cannot be cancelled" },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // update order status
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
        },
      });
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
      { message: "Error cancelling order" },
      { status: 500 },
    );
  }
}
