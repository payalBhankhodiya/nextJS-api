import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { updateProductSchema } from "@/validation/product";
import { requireRoles } from "@/lib/require-role";

// GET product by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN", "USER"]);
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        categories: true,
      },
    });

    if (!product) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error fetching products" },
      { status: 500 },
    );
  }
}

// UPDATE product
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN"]);
    const { id } = await params;
    const body = await req.json();

    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const data = result.data;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    const newStock = data.stock ?? product.stock;

    const stockDifference = newStock - product.stock;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },

        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          stock: newStock,

          images: data.imageIds
            ? {
                set: data.imageIds.map((imgId) => ({ id: imgId })),
              }
            : undefined,

          categories: data.categoryIds
            ? {
                set: data.categoryIds.map((id) => ({ id })),
              }
            : undefined,
        },

        include: {
          images: true,
          categories: true,
        },
      });

      if (stockDifference !== 0) {
        await tx.inventoryLog.create({
          data: {
            productId: id,
            type: "ADJUSTMENT",
            quantity: stockDifference,
            note: `Stock updated from ${product.stock} to ${newStock}`,
          },
        });
      }

      return updatedProduct;
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
      { message: "Error updating products" },
      { status: 500 },
    );
  }
}

// DELETE product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(req, ["ADMIN"]);
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    // prevent deleting product used in orders
    const usedInOrders = await prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (usedInOrders) {
      return NextResponse.json(
        { message: "Cannot delete product used in orders" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryLog.deleteMany({
        where: { productId: id },
      });

      await tx.image.deleteMany({
        where: { productId: id },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error deleting products" },
      { status: 500 },
    );
  }
}
