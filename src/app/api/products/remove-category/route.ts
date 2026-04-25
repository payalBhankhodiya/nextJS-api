import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  productId: z.uuid(),
  categoryId: z.uuid(),
});

// remove categories from product
export async function POST(req: NextRequest) {
  try {

    await requireRoles(req, ["ADMIN"]);

   const body = await req.json();

    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.issues,
        },
        { status: 400 }
      );
    }

    const { productId, categoryId } = result.data;

     const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

     const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        categories: {
          disconnect: {
            id: categoryId,
          },
        },
      },
      include: {
        categories: {
          select: { id: true },
        },
      },
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
      { message: "Error removing category" },
      { status: 500 }
    );
  }
}





