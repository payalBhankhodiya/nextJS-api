import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createOrderSchema } from "@/validation/order";

// CREATE order
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { userId, productId, quantity } = result.data;

    // check user + product in parallel
    const [user, product] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { message: "Not enough stock" },
        { status: 400 },
      );
    }

    const total = product.price * quantity;

    // atomic transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          productId,
          quantity,
          total,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: quantity,
          },
        },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error creating order" },
      { status: 500 },
    );
  }
}

// GET all orders
export async function GET() {
  try {
    const orders = await prisma.order.findMany();

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json(
      { message: "Error fetching orders" },
      { status: 500 },
    );
  }
}
