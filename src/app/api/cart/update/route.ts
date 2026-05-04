import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { updateToCartSchema } from "@/validation/cart";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRoles(req, ["USER", "ADMIN"]);

    const body = await req.json();
    const result = updateToCartSchema.safeParse(body);

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

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Get cart
      const cart = await tx.cart.findUnique({
        where: { userId: user.userId },
      });

      if (!cart) {
        throw new Error("CART_NOT_FOUND");
      }

      // Get existing item
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (!existing) {
        throw new Error("ITEM_NOT_FOUND");
      }

      // Get product for stock
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const newQty = existing.quantity + quantity;

      if (newQty <= 0) {
        await tx.cartItem.delete({
          where: { id: existing.id },
        });
        return { message: "Item removed from cart" };
      }

      // Stock check
      if (newQty > product.stock) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // Update
      return await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: true },
      });
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (err.message === "CART_NOT_FOUND") {
      return NextResponse.json({ message: "Cart not found" }, { status: 404 });
    }
    if (err.message === "ITEM_NOT_FOUND") {
      return NextResponse.json(
        { message: "Item not found in cart" },
        { status: 404 },
      );
    }
    if (err.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }
    if (err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { message: "Not enough stock available" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Error updating cart" },
      { status: 500 },
    );
  }
}
