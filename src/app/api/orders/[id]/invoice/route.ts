import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireRoles(req, ["ADMIN", "USER"]);

    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (currentUser.role !== "ADMIN" && order.userId !== currentUser.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const invoice = {
      invoiceId: `INV-${new Date(order.createdAt).getFullYear()}-${order.id.slice(0, 6)}`,

      customer: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      },

      items: order.items.map((item) => ({
        title: item.product.title,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),

      total: order.total,
      currency: "INR",
      status: order.status,
      date: order.createdAt,
    };

    return NextResponse.json({
      message: "Invoice generated",
      data: invoice,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
