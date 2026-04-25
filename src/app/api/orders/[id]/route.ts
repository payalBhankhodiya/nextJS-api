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
        product: true,
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

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
      },
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

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Order deleted successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: "Error deleting order" },
      { status: 500 }
    );
  }
}
