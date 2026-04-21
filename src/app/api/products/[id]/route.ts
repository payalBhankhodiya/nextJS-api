import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

import { updateProductSchema } from "@/validation/product";

// GET product by ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// UPDATE product
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const updated = await prisma.product.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        stock: data.stock,
        image: data.image,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const deleted = await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
