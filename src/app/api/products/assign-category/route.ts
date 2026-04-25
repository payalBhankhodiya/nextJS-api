import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  productIds: z.array(z.uuid()).min(1).max(10),
  categoryIds: z.array(z.uuid()).min(1).max(5),
});

// Assign category to product
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
        { status: 400 },
      );
    }

    const { productIds, categoryIds } = result.data;

    // transaction
    const resultTx = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const categories = await tx.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true },
      });

      if (products.length !== productIds.length) {
        throw new Error("Some products not found");
      }

      if (categories.length !== categoryIds.length) {
        throw new Error("Some categories not found");
      }

      await Promise.all(
        productIds.map((productId) =>
          tx.product.update({
            where: { id: productId },
            data: {
              categories: {
                connect: categoryIds.map((id) => ({ id })),
              },
            },
          }),
        ),
      );

      return { success: true };
    });

    return Response.json({
      message: "Bulk assignment successful",
      ...resultTx,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        message: err.message || "Something went wrong",
      },
      { status: 500 },
    );
  }
}
