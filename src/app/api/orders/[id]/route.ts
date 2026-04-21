import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateOrderSchema } from "@/validation/order";

// GET order
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// UPDATE order status only

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE order

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ORDER ERROR:", error);

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
