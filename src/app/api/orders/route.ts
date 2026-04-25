import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/validation/order";
import { requireRoles } from "@/lib/require-role";

// CREATE order
export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireRoles(req, ["USER"]);

    console.log("CURRENT USER:", currentUser);

  

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

    const { productId, addressId, quantity } = result.data;

    const userId = currentUser.userId;

    // check user + product + address in parallel
    const [user, product, address] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.address.findUnique({ where: { id: addressId } }),
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

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 },
      );
    }

    // stock check
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
          addressId,
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
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error creating orders" },
      { status: 500 },
    );
  }
}

// GET all orders
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireRoles(req, ["ADMIN", "USER"]);

    console.log("CURRENT USER:", currentUser);

    let orders;

    if (currentUser.role === "ADMIN") {
      orders = await prisma.order.findMany();
    } else {
      orders = await prisma.order.findMany({
        where: {
          userId: currentUser.userId,
        },
      });
    }

    return NextResponse.json(orders, { status: 200 });
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
