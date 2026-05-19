import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { updateOrderSchema } from "@/validation/order";
import { requireRoles } from "@/lib/require-role";

// GET order by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireRoles(req, ["ADMIN", "USER"]);

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        address: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (currentUser.role !== "ADMIN" && order.userId !== currentUser.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error fetching orders" },
      { status: 500 },
    );
  }
}

// UPDATE order status only

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN"]);
    const { id } = await params;
    const body = await req.json();

    const result = updateOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { status } = result.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

   const updated = await prisma.$transaction(async (tx) => {
  // fetch order items
  const orderItems = await tx.orderItem.findMany({
    where: { orderId: id },
  });

  // restore stock on cancellation
  const shouldRestoreStock =
    status === "CANCELLED" &&
    order.status !== "CANCELLED";

  // restore stock on return
  const shouldHandleReturn =
    status === "RETURNED" &&
    order.status !== "RETURNED";

  if (shouldRestoreStock || shouldHandleReturn) {
    for (const item of orderItems) {
      // restore stock
      await tx.product.update({
        where: { id: item.productId },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      // inventory log
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,

          type: shouldRestoreStock
            ? "CANCELLED_ORDER"
            : "RETURN",

          quantity: item.quantity,

          note: shouldRestoreStock
            ? `Order ${id} cancelled`
            : `Order ${id} returned`,
        },
      });
    }
  }

  // update order status
  const updatedOrder = await tx.order.update({
    where: { id },

    data: { status },

    include: {
      items: {
        include: {
          product: true,
        },
      },

      address: true,
    },
  });

  return updatedOrder;
});

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error updating order" },
      { status: 500 },
    );
  }
}

// DELETE order

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireRoles(req, ["ADMIN", "USER"]);

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (currentUser.role !== "ADMIN" && order.userId !== currentUser.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (currentUser.role !== "ADMIN" && order.status !== "PENDING") {
      return NextResponse.json(
        { message: "You can only delete pending orders" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      await tx.order.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Order deleted successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error deleting order" },
      { status: 500 },
    );
  }
}


