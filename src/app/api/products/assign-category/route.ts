import { prisma } from "@/lib/prisma";

// Assign category to product
export async function POST(req: Request) {
  try {
    const { productId, categoryId } = await req.json();

    if (!productId || !categoryId) {
      return Response.json(
        { message: "productId and categoryId required" },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        categories: {
          connect: { id: categoryId },
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

    return Response.json(product);
  } catch {
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
