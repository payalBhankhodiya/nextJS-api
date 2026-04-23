import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        product: true,
      },
    });

    if (!order) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const invoice = {
      invoiceId: "INV-" + order.id.slice(0, 6),
      customer: order.userId,
      product: order.product.title,
      quantity: order.quantity,
      price: order.product.price,
      total: order.total,
      date: order.createdAt,
    };

    return Response.json({
      message: "Invoice generated",
      data: invoice,
    });
  } catch (error: any) {
    return Response.json({ message: error.message }, { status: 500 });
  }
}
