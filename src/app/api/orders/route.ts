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

    const { addressId, items } = result.data;

    const userId = currentUser.userId;

    // fetch address
    const address = await prisma.address.findUnique({
      where: { id: addressId, userId },
    });

    if (!address) {
      return NextResponse.json(
        { message: "Address not found" },
        { status: 404 },
      );
    }

    // fetch all products at once
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: items.map((i) => i.productId),
        },
      },
    });

    // validate all items
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        return NextResponse.json(
          { message: `Product not found: ${item.productId}` },
          { status: 404 },
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { message: `Not enough stock for ${product.title}` },
          { status: 400 },
        );
      }
    }

    // calculate total
    const total = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    // transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId,
          total,
          items: {
            create: items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;

              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
        },
      });

      // update stock + create inventory logs
      for (const item of items) {
        // decrement stock
        await tx.product.update({
          where: { id: item.productId },

          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // inventory log
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,

            type: "SALE",

            quantity: -item.quantity,

            note: `Order ${newOrder.id} placed`,
          },
        });
      }

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
      orders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
          user: true,
        },
      });
    } else {
      orders = await prisma.order.findMany({
        where: {
          userId: currentUser.userId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
        },
      });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (err: any) {
    console.error("GET /orders error:", err);
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
