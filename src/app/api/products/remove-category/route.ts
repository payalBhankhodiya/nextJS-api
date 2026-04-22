import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { productId, categoryId } = await req.json();

    if (!productId || !categoryId) {
      return NextResponse.json(
        { message: "productId and categoryId required" },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        categories: {
          disconnect: {
            id: categoryId,
          },
        },
      },
      include: {
        categories: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { message: "Error removing category" },
      { status: 500 },
    );
  }
}
