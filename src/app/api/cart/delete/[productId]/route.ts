import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await requireRoles(req, ["USER", "ADMIN"]);
    const { productId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      // Get cart
      const cart = await tx.cart.findUnique({
        where: { userId: user.userId },
      });

      if (!cart) {
        throw new Error("CART_NOT_FOUND");
      }

      // Find item using composite key
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

      // Delete item
      await tx.cartItem.delete({
        where: { id: existing.id },
      });

      return { message: "Item removed from cart" };
    });

    return NextResponse.json(result, { status: 200 });

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
      return NextResponse.json({ message: "Item not found in cart" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Error deleting item" },
      { status: 500 },
    );
  }
}