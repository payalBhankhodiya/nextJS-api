import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createProductSchema } from "@/validation/product";
import { requireRoles } from "@/lib/require-role";

// CREATE product
export async function POST(req: NextRequest) {
  try {
    await requireRoles(req, ["ADMIN"]);
    const body = await req.json();

    const result = createProductSchema.safeParse(body);

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

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        price: data.price,
        stock: data.stock,
        images: {
          connect: data.imageIds?.map((id) => ({ id })) || [],
        },
        categories: {
          connect: data.categoryIds?.map((id) => ({ id })) || [],
        },
      },
      include: {
        categories: true,
        images: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Error creating products" },
      { status: 500 },
    );
  }
}

// Get all products
export async function GET(req: NextRequest) {
  try {
    // requireRoles(req: NextRequest, roles: Role[])

    await requireRoles(req, ["ADMIN", "USER"]);
    const { searchParams } = new URL(req.url);

    const categoryIds = searchParams.getAll("category");
    const minPrice = searchParams.get("min");
    const maxPrice = searchParams.get("max");

    const where: any = {};

    if (categoryIds.length) {
      where.categories = {
        some: {
          id: {
            in: categoryIds,
          },
        },
      };
    }

    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice && { gte: Number(minPrice) }),
        ...(maxPrice && { lte: Number(maxPrice) }),
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        categories: true,
        images: true,
      },
    });

    return NextResponse.json(products, { status: 200 });
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
