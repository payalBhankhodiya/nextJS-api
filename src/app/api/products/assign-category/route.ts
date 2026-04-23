import { prisma } from "@/lib/prisma";

// Assign category to product
export async function POST(req: Request) {
  try {
    const { productIds, categoryIds } = await req.json();

    // validation
    if (
      !Array.isArray(productIds) ||
      productIds.length === 0 ||
      !Array.isArray(categoryIds) ||
      categoryIds.length === 0
    ) {
      return Response.json(
        { message: "productIds and categoryIds are required" },
        { status: 400 },
      );
    }

    // safety limits
    if (productIds.length > 10 || categoryIds.length > 5) {
      return Response.json({ message: "Too many items" }, { status: 400 });
    }

    // transaction
    const result = await prisma.$transaction(async (tx) => {
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
      ...result,
    });
  } catch (error: any) {
    return Response.json(
      {
        message: error.message || "Something went wrong",
      },
      { status: 500 },
    );
  }
}
