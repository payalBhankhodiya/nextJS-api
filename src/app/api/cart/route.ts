import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { addToCartSchema } from "@/validation/cart";

// Add to cart
export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles(req, ["USER", "ADMIN"]);

    const body = await req.json();
    const result = addToCartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { productId, quantity } = result.data;

    // Check product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    // Transaction
    const cartItem = await prisma.$transaction(async (tx) => {
      // Get or create cart
      let cart = await tx.cart.findUnique({
        where: { userId: user.userId },
      });

      cart ??= await tx.cart.create({
        data: { userId: user.userId },
      });

      // Get existing item
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      const newQty = (existing?.quantity ?? 0) + quantity;

      // Stock check
      if (newQty > product.stock) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // Upsert
      return await tx.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        update: {
          quantity: newQty,
        },
        create: {
          cartId: cart.id,
          productId,
          quantity: newQty,
        },
        include: {
          product: true,
        },
      });
    });

    return NextResponse.json(cartItem, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { message: "Not enough stock available" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Error adding to cart" },
      { status: 500 },
    );
  }
}

// Get cart
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireRoles(req, ["USER", "ADMIN"]);

    // ADMIN : get all carts
    if (currentUser.role === "ADMIN") {
      const carts = await prisma.cart.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return NextResponse.json({
        carts,
      });
    }

    // USER : get single cart
    const cart = await prisma.cart.findUnique({
      where: {
        userId: currentUser.userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // always return safe structure (no null cart system)
    const safeCart = cart ?? {
      id: null,
      userId: currentUser.userId,
      items: [],
    };

    // Calculate totals
    const total = safeCart.items.reduce((sum, item) => {
      return sum + item.quantity * item.product.price;
    }, 0);

    const totalItems = safeCart.items.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    return NextResponse.json({
      id: safeCart.id,
      userId: safeCart.userId,
      items: safeCart.items,
      total,
      totalItems,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error fetching cart" },
      { status: 500 },
    );
  }
}
