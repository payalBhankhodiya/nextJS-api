import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/require-role";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireRoles(req, ["USER", "ADMIN"]);

    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get("category");

    if (!categoryName) {
      return NextResponse.json({ error: "Category required" }, { status: 400 });
    }

    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: categoryName,
          mode: "insensitive",
        },
      },
      include: {
        children: true,
      },
    });

    if (!categories.length) {
      return NextResponse.json([]);
    }

    // collect all category IDs + children
    const categoryIds = [
      ...new Set(
        categories.flatMap((cat) => [cat.id, ...cat.children.map((c) => c.id)]),
      ),
    ];

    const products = await prisma.product.findMany({
      where: {
        categories: {
          some: {
            id: {
              in: categoryIds,
            },
          },
        },
      },
      include: {
        categories: true,
      },
    });

    return NextResponse.json(products);
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

