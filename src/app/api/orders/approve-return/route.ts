import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    await requireRoles(req, ["ADMIN"]);

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

    // only requested returns can be approved
    if (order.status !== "RETURN_REQUESTED") {
      return NextResponse.json(
        { message: "Invalid return request" },
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
          status: "RETURNED",
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
      { message: "Error processing return" },
      { status: 500 },
    );
  }
}
